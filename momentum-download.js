const fs = require('fs');
const http = require('http');
const moment = require('moment');
const rp = require('request-promise');

logger('Starting');

function fetchAllData() {
  logger('Fetching all data from momentum api...');

  return new Promise(function(resolve, reject) {
    // Predefined persistent metadata to authenticate against momentum api
    const apiUrl = 'https://api.momentumdash.com/backgrounds/history';
    const options = {
      uri: apiUrl,
      headers: {
        'x-momentum-version': '0.96.3',

        // Essentially using my own key, although getting a new one by observing outgoing network from momentum is pretty simple
        'authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2d1aWQiOiIxYTliNGQ3Yy0zODU0LTRhMzgtOGNmMi04OGRhNjgxNTMyZDEiLCJpc3MiOiJsb2dpbi1hcGktdjEiLCJleHAiOjE1MDE3OTkwMjAsIm5iZiI6MTQ3MDI2MzAyMH0.6hEHqqHXruBt52anFFczFgxsUAP9HWvYY2hQod4UjZs',
      }
    };

    // Setup for data transaction
    let date = moment();
    const receivedData = [];
    const emptyStateString = '{"history":[]}'; // The data is provided as JSON at this point, hence empty state is strictly an empty history array

    // Send api requests recursively until all data is fetched
    async function sendRequest(priorToDate = null) {
      // Append priorToDate query string parameter if given; Sets momentum api a range of requested data
      const thinOptions = Object.assign(options, !priorToDate ? {} : {uri: `${apiUrl}?priorToDate=${priorToDate}`});

      try {
        const body = await rp.get(thinOptions)

        // Assuming we're not on empty state, we can save the received data from current iteration and call up another round
        if (body !== emptyStateString) {
          receivedData.push(body); // Push a new dataBlock for each request iteration

          // As per client defaults, momentum sets a gap of 39-days before each request
          date = date.subtract(39, 'days');
          const nextDateFormatted = date.format('YYYY-MM-DD'); // Format date as string for priorToDate expected format
          sendRequest(nextDateFormatted); // Call up another iteration with the next gapped date from current

          logger(`Sending next request for: ${nextDateFormatted}`);
        } else {
          // Resolve the fetchAllData promise, indicating all available data has been fetched and the recursion has reached its stop condition
          resolve(receivedData);
          logger(`All available data fetched (${receivedData.length} requests sent)`)
        }
      } catch (error) {
        // In case any of this business has failed, reject the fetchAllData promise with provided error
        reject(error);
      }
    }

    logger('Sending first request');
    sendRequest(); // Send the first requset without priorToDate, indicating we start from current real date
  });
}

function downlaodFromApi(data) {
  // Break each dataBlock (resolved api request)
  data.forEach((block, blockIdx) => {
    try {
      const dataBlock = JSON.parse(block);

      // Given any data is available on block, iterate over it and download available files
      if (dataBlock.history) {
        dataBlock.history.forEach((dataEntry, entryIdx) => {
          logger(`Downloading [dataBlock: ${blockIdx}/${data.length - 1}, dataEntry: ${entryIdx}/${dataBlock.history.length - 1}]`);

          // Send an http get request for each file in the respective dataBlock and pipe it to a new file stream until done saving
          const fileStream = fs.createWriteStream(`momentum-download/${blockIdx}-${entryIdx}.jpg`);
          http.get(dataEntry.thumbnail_url.replace('https', 'http'), (response) => response.pipe(fileStream));

          // Increase global download count, despite not taking in account failed file transactions
          downloadCount++;
        });
      }
    } catch (error) {
      throw error;
    }
  });
}

function logger(text) {
  // Prefix logging
  console.log('[momentum-download]', text);
}

// Keep a global download count
let downloadCount = 0;

fetchAllData()
  .then((data) => downlaodFromApi(data))
  .then(() => logger(`Finishing downlaod for ${downloadCount} files...`)) // In reality, the download requests finish before the actual file stream ends
  .catch((error) => {
    // Globally catch all exceptions here
    throw new Error(error);
  });