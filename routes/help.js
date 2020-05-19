const https = require('https');

let oBackUpData = { 'csse': null, 'ecdc': null };

exports.getAPI = (url, type, fn) => new Promise((resolve, reject) => {
  return https
    .get(url, (response) => {
      let body = ''
      response.on('data', (chunk) => body += chunk)
      response.on('end', () => {
        try {
          let data = JSON.parse(body);
          oBackUpData[type] = data;
          if (fn) {
            resolve(fn(data));
          } else {
            resolve(data);
          }
        } catch (error) {
          let data = oBackUpData[type];
          if (fn) {
            resolve(fn(data));
          } else {
            resolve(data);
          }
        }
      });
    })
    .on('error', reject);
});