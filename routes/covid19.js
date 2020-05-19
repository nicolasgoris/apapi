const express = require('express'),
  router = express.Router(),
  help = require('./help');

const sUrlECDC = 'https://opendata.ecdc.europa.eu/covid19/casedistribution/json/',
  sUrlCSSE = 'https://api.covid19api.com/';

let cleanData = (aCountry) => {
  let bFirstEntryFound = false;
  while (!bFirstEntryFound) {
    let oRecord = aCountry.pop();
    if (parseInt(oRecord.cases) || parseInt(oRecord.deaths)) {
      aCountry.push(oRecord);
      bFirstEntryFound = true;
    }
  }
  aCountry = aCountry.map(oRecord => {
    oRecord = changeDataTypes(oRecord);
    oRecord.countriesAndTerritories = capFirstChar(oRecord.countriesAndTerritories);
    oRecord.date = new Date(oRecord.year, oRecord.month - 1, oRecord.day)
    return oRecord;
  }).sort((oRecordA, oRecordB) => { return (oRecordA.date - oRecordB.date); });
  return aCountry;
}

let capFirstChar = (sText) => {
  return sText[0].toUpperCase() + sText.slice(1).replace("_", " ");
}

let changeDataTypes = (oRecord) => {
  let aIntTypes = ['cases', 'day', 'deaths', 'month', 'year'], oTypedRecord = oRecord;
  for (let sProp in oRecord) {
    if (oRecord.hasOwnProperty(sProp) && aIntTypes.includes(sProp)) {
      oRecord[sProp] = parseInt(oRecord[sProp]);
    }
  }
  return oTypedRecord;
}

let getGlobalTableData = (oData) => {
  let data = {
    labels: [],
    rows: []
  }, oGlobal = oData.Global;
  for (let sProp in oGlobal) {
    if (oGlobal.hasOwnProperty(sProp)) {
      let sPrefix = sProp.slice(0, 3) === "New" ? "New" : "Total";
      data.labels.push(sProp.split(sPrefix).pop());
      let oRowFound = data.rows.find(oRow => {
        return oRow.type === sPrefix;
      });
      if (!oRowFound) {
        oRowFound = { type: sPrefix };
        data.rows.push(oRowFound);
      }
      oRowFound[sProp.split(sPrefix).pop()] = oGlobal[sProp];
    }
  }
  data.labels = [...new Set(data.labels)];
  return data;
}

let getAllCountryRows = (oData) => {
  let aRows = [],
    aCountries = oData.Countries,
    aLabels = ["Confirmed", "Deaths", "Recovered"],
    bFilterZeros = true;
  aCountries.forEach(oCountry => {
    aRows = [...aRows, ...getCountryRows(aLabels, oCountry)];
  })
  if (bFilterZeros) {
    aRows = aRows.filter(oRow => {
      return oRow.Confirmed || oRow.Deaths || oRow.Recovered;
    });
  }
  return aRows;
}

let getCountryRows = (aLabels, oCountry) => {
  let oRows = [];
  for (let sProp in oCountry) {
    let sPrefix = sProp.slice(0, 3) === "New" ? "New" : "Total";
    if (aLabels.includes(sProp.split(sPrefix).pop()) && oCountry.hasOwnProperty(sProp)) {
      let oRowFound = oRows.find(oRow => {
        return oRow.type === sPrefix;
      });
      if (!oRowFound) {
        oRowFound = { country: oCountry.Country, type: sPrefix };
        oRows.push(oRowFound);
      }
      oRowFound[sProp.split(sPrefix).pop()] = oCountry[sProp];
    }
  }
  return oRows;
}

let getChartData = (oGlobal) => {
  let data = {
    new: {
      labels: [],
      values: []
    },
    total: {
      labels: [],
      values: []
    }
  };
  for (let sProp in oGlobal) {
    if (oGlobal.hasOwnProperty(sProp)) {
      if (sProp.slice(0, 3) === "New") {
        data.new.labels.push(sProp.slice(3));
        data.new.values.push(oGlobal[sProp]);
      } else {
        data.total.labels.push(sProp.slice(5));
        data.total.values.push(oGlobal[sProp]);
      }
    }
  }
  return data;
}

let getDefaultSettings = (sLabel, oChartData) => {
  return {
    type: 'horizontalBar',
    data: {
      labels: oChartData[sLabel].labels,
      datasets: [{
        label: '# of ' + sLabel + ' cases',
        data: oChartData[sLabel].values,
        backgroundColor: [
          'rgba(255, 99, 132, 0.2)',
          'rgba(54, 162, 235, 0.2)',
          'rgba(255, 206, 86, 0.2)'
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)'
        ],
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: false
          }
        }]
      }
    }
  };
}

let calcCountry = (aRecords) => {
  let aCountry = [],
    nTotalCases = 0,
    nTotalDeaths = 0;

  aRecords.forEach(oRecord => {
    let oNewRecord = { dateRep: oRecord.dateRep, newCases: oRecord.cases, cumulCases: nTotalCases + oRecord.cases, newDeaths: oRecord.deaths, cumulDeaths: nTotalDeaths + oRecord.deaths };
    nTotalCases += oRecord.cases;
    nTotalDeaths += oRecord.deaths;
    aCountry.push(oNewRecord);
  });

  return aCountry;
}

let getDataSets = (aRecords) => {
  let oDataSets = {
    newCases: [], cumulCases: [], newDeaths: [], cumulDeaths: []
  };
  aRecords.forEach(oRecord => {
    oDataSets.newCases.push(oRecord.newCases);
    oDataSets.cumulCases.push(oRecord.cumulCases);
    oDataSets.newDeaths.push(oRecord.newDeaths);
    oDataSets.cumulDeaths.push(oRecord.cumulDeaths);
  });
  return oDataSets;
}

let getDefaultLineSettings = (aLabels, oDataSets) => {
  let oTranslations = { date: "Date", newCases: "New cases", cumulCases: "Cumulative cases", newDeaths: "New deaths", cumulDeaths: "Cumulative deaths" },
    oChartColors = { newCases: 'rgb(255, 99, 132)', cumulCases: 'rgb(255, 205, 86)', newDeaths: 'rgb(75, 192, 192)', cumulDeaths: 'rgb(54, 162, 235)' },
    backgroundColor = 'rgba(255, 255, 255, 0)',
    oSettings = {
      "type": "line",
      "data": {
        "labels": aLabels,
        "datasets": []
      }
    };
  for (let sProp in oDataSets) {
    if (oDataSets.hasOwnProperty(sProp)) {
      oSettings.data.datasets.push({
        label: oTranslations[sProp],
        data: oDataSets[sProp],
        borderColor: oChartColors[sProp],
        backgroundColor: backgroundColor
      })
    }
  }
  return oSettings;
}

router.get('/ecdc', (req, res) => {
  let url = sUrlECDC;
  return (async () => res.json(JSON.parse(await help.getAPI(url, 'ecdc'))))()
});

router.get('/ecdc/country/:country', (req, res) => {
  let url = sUrlECDC;
  if (req.params.country) {
    let fn = function (oData) {
      return JSON.parse(oData).records.filter(oRecord => {
        return oRecord.geoId === req.params.country;
      });
    }
    return (async () => res.json(await help.getAPI(url, 'ecdc', fn)))()
  }
});

router.get('/ecdc/country/:country/table', (req, res) => {
  let url = sUrlECDC;
  if (req.params.country) {
    let fn = function (oData) {
      let aCountry = JSON.parse(oData).records.filter(oRecord => {
        return oRecord.geoId === req.params.country;
      });
      return cleanData(aCountry);
    }
    return (async () => res.json(await help.getAPI(url, 'ecdc', fn)))()
  }
});

router.get('/ecdc/country/:country/graph', (req, res) => {
  let url = sUrlECDC;
  if (req.params.country) {
    let fn = function (oData) {
      let aCountry = JSON.parse(oData).records.filter(oRecord => {
        return oRecord.geoId === req.params.country;
      });
      let aCleanData = calcCountry(cleanData(aCountry));
      aLabels = aCleanData.map((oRecord) => { return oRecord.dateRep; }),
        oDataSets = getDataSets(aCleanData);
      return getDefaultLineSettings(aLabels, oDataSets)
    }
    return (async () => res.json(await help.getAPI(url, 'ecdc', fn)))()
  }
});

router.get('/csse-jhu', (req, res) => {
  let url = sUrlCSSE;
  return (async () => res.json(JSON.parse(await help.getAPI(url, 'csse'))))()
});

router.get('/csse-jhu/summary', (req, res) => {
  let url = sUrlCSSE + '/summary';
  return (async () => res.json(JSON.parse(await help.getAPI(url, 'csse'))))()
});

router.get('/csse-jhu/summary/table/global', (req, res) => {
  let url = sUrlCSSE + '/summary';
  return (async () => res.json(await help.getAPI(url, 'csse', getGlobalTableData)))();
});

router.get('/csse-jhu/summary/table/countries', (req, res) => {
  let url = sUrlCSSE + '/summary';
  return (async () => res.json(await help.getAPI(url, 'csse', getAllCountryRows)))();
});

router.get('/csse-jhu/summary/graph/new', (req, res) => {
  let url = sUrlCSSE + '/summary',
    fn = (oData) => {
      return getDefaultSettings('new', getChartData(oData.Global));
    };
  return (async () => res.json(await help.getAPI(url, 'csse', fn)))();
});

router.get('/csse-jhu/summary/graph/total', (req, res) => {
  let url = sUrlCSSE + '/summary',
    fn = (oData) => {
      return getDefaultSettings('total', getChartData(oData.Global));
    };
  return (async () => res.json(await help.getAPI(url, 'csse', fn)))();
});

router.get('/csse-jhu/summary/country/:country', (req, res) => {
  let url = sUrlCSSE + '/summary';
  return (async () => res.json(JSON.parse(await help.getAPI(url, 'csse'))))()
});

module.exports = router;