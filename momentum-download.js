const http = require('http');
const fs = require('fs');
const rp = require('request-promise');
const moment = require('moment');

logger('start');

function fetchAllData() {
  logger('Fetching all data from momentum api...');
  return new Promise(function(resolve, reject) {
    const apiUrl = 'https://api.momentumdash.com/backgrounds/history';
    const options = {
      uri: apiUrl,
      headers: {
        'x-momentum-version': '0.96.3',
        'authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2d1aWQiOiIxYTliNGQ3Yy0zODU0LTRhMzgtOGNmMi04OGRhNjgxNTMyZDEiLCJpc3MiOiJsb2dpbi1hcGktdjEiLCJleHAiOjE1MDE3OTkwMjAsIm5iZiI6MTQ3MDI2MzAyMH0.6hEHqqHXruBt52anFFczFgxsUAP9HWvYY2hQod4UjZs',
        // 'x-momentum-clientdate':'2017-07-29'
      }
    };

    let date = moment();
    const receivedData = [];
    const emptyStateString = '{"history":[]}';

    async function sendRequest(priorToDate = null) {
      const thinOptions = Object.assign(options, !priorToDate ? {} : {uri: `${apiUrl}?priorToDate=${priorToDate}`});
      try {
        const body = await rp.get(thinOptions)
        // console.log(body);
        if (body !== emptyStateString) {
          receivedData.push(body);

          date = date.subtract(39, 'days');
          const nextDateFormatted = date.format('YYYY-MM-DD');
          sendRequest(nextDateFormatted);
          logger(`Next call: ${nextDateFormatted}`);
        } else {
          resolve(receivedData);
          logger(`Recursion reached stop condition: All available data fetched (${receivedData.length} requests sent)`)
        }
      } catch (error) {
        reject(error);
      }
    }

    logger('First call');
    sendRequest();
  });
}

fetchAllData().then((data) => console.log(data.length));




// (error, response, body) => {
//   logger('data received, saving to file');
//   fs.writeFile('momentum-data.json', body);
// }


// const file = fs.createWriteStream("file.jpg");
// const request = http.get("http://i3.ytimg.com/vi/J---aiyznGQ/mqdefault.jpg", function(response) {
//   response.pipe(file);
// });

// curl 'https://api.momentumdash.com/backgrounds/history'
// -H 'pragma: no-cache' -H 'accept-encoding: gzip, deflate, br'
// -H 'accept-language: en-GB,he;q=0.8,en;q=0.6,en-US;q=0.4'
// -H 'x-momentum-version: 0.96.3'
// -H 'authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2d1aWQiOiIxYTliNGQ3Yy0zODU0LTRhMzgtOGNmMi04OGRhNjgxNTMyZDEiLCJpc3MiOiJsb2dpbi1hcGktdjEiLCJleHAiOjE1MDE3OTkwMjAsIm5iZiI6MTQ3MDI2MzAyMH0.6hEHqqHXruBt52anFFczFgxsUAP9HWvYY2hQod4UjZs'
// -H 'accept: application/json, text/javascript, */*; q=0.01'
// -H 'cache-control: no-cache'
// -H 'x-momentum-clientid: 2471970b-fe1f-4795-88bd-5a82308c07a8'
// -H 'authority: api.momentumdash.com'
// -H 'cookie: momo_token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2d1aWQiOiIxYTliNGQ3Yy0zODU0LTRhMzgtOGNmMi04OGRhNjgxNTMyZDEiLCJpc3MiOiJsb2dpbi1hcGktdjEiLCJleHAiOjE1MDE3OTkwMjAsIm5iZiI6MTQ3MDI2MzAyMH0.6hEHqqHXruBt52anFFczFgxsUAP9HWvYY2hQod4UjZs; momo_token_expires=636373581953404705; ARRAffinity=3505693a8b451d67679c348bd8d62d31aef8eaaafa9083fda4f49e929c986f0e; __stripe_mid=35733941-834a-433f-a601-b17ef93993ef; _ga=GA1.2.1734628077.1501344575; _gid=GA1.2.1126563001.1501344575'
// -H 'x-momentum-clientdate: 2017-07-29'
// -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 Safari/537.36' --compressed

function logger(text) {
  console.log('[momentum-download]', text);
}