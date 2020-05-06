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
  },
    oGlobal = JSON.parse(oData).Global;
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
    aCountries = JSON.parse(oData).Countries,
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


router.get('/ecdc', (req, res) => {
  let url = sUrlECDC;
  return (async () => res.json(JSON.parse(await help.getAPI(url))))()
});

router.get('/ecdc/country/:country', (req, res) => {
  let url = sUrlECDC;
  if (req.params.country) {
    let fn = function (oData) {
      return JSON.parse(oData).records.filter(oRecord => {
        return oRecord.geoId === req.params.country;
      });
    }
    return (async () => res.json(await help.getAPI(url, fn)))()
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
    return (async () => res.json(await help.getAPI(url, fn)))()
  }
});

router.get('/csse-jhu', (req, res) => {
  let url = sUrlCSSE;
  return (async () => res.json(JSON.parse(await help.getAPI(url))))()
});

router.get('/csse-jhu/summary', (req, res) => {
  let url = sUrlCSSE + '/summary';
  return (async () => res.json(JSON.parse(await help.getAPI(url))))()
});

router.get('/csse-jhu/summary/table/global', (req, res) => {
  let url = sUrlCSSE + '/summary';
  return (async () => res.json(await help.getAPI(url, getGlobalTableData)))();
});

router.get('/csse-jhu/summary/table/countries', (req, res) => {
  let url = sUrlCSSE + '/summary';
  return (async () => res.json(await help.getAPI(url, getAllCountryRows)))();
});

router.get('/csse-jhu/summary/graph/new', (req, res) => {
  let url = sUrlCSSE + '/summary',
    fn = (oData) => {
      return getDefaultSettings('new', getChartData(JSON.parse(oData).Global));
    };
  return (async () => res.json(await help.getAPI(url, fn)))();
});

router.get('/csse-jhu/summary/graph/total', (req, res) => {
  let url = sUrlCSSE + '/summary',
    fn = (oData) => {
      return getDefaultSettings('total', getChartData(JSON.parse(oData).Global));
    };
  return (async () => res.json(await help.getAPI(url, fn)))();
});

router.get('/csse-jhu/summary/country/:country', (req, res) => {
  let url = sUrlCSSE + '/summary';
  return (async () => res.json(JSON.parse(await help.getAPI(url))))()
});

module.exports = router;