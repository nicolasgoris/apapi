const https = require('https');

exports.getAPI = (url, fn) => new Promise((resolve, reject) => {
  return https
    .get(url, (response) => {
      let body = ''
      response.on('data', (chunk) => body += chunk)
      if (fn) {
        response.on('end', () => resolve(fn(body)))
      } else {
        response.on('end', () => resolve(body))
      }
      
    })
    .on('error', reject);
});