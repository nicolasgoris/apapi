# AP API
This will help you execute API calls to the following APIs:
* [COVID 19 API](https://covid19api.com/)
* [ECDC COVID-19](https://www.ecdc.europa.eu/en/publications-data/download-todays-data-geographic-distribution-covid-19-cases-worldwide)

## Installation
### Node.js
Please first install [Node.js](https://nodejs.org/en/), a tool to run JavaScript outside the browser.

### Node Package Manager
Use the package manager [npm](https://pip.pypa.io/en/stable/) to install.

```bash
npm install
```

## Usage
Execute the following command in your bash
```bash
npm run start
```

### Browser
Test in your browser if everything is running smoothly via following url: [http://localhost:3001/api/](http://localhost:3001/api/).
### JavaScript
Via Javascript you can use the following code for example.
```javascript
$.getJSON("http://localhost:3001/api/covid19/csse-jhu/summary")
```

## License
[MIT](https://choosealicense.com/licenses/mit/)