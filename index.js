require('./flatmap');
const commandLineArgs = require('command-line-args');
const path = require('path')
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');
const { env } = require('process');

const DEEPL_API_URL = 'https://api.deepl.com/v2/';
const DEEPL_FREE_API_URL = 'https://api-free.deepl.com/v2/';

const OPTION_DEFINITIONS = [
  { name: 'input', alias: 'i', type: String },
  { name: 'output', alias: 'o', type: String },
  { name: 'source', alias: 's', type: String },
  { name: 'target', alias: 't', type: String },
  { name: 'key', alias: 'k', type: String },
  { name: 'free', alias: 'r', type: Boolean },
  { name: 'formal', alias: 'f', type: Boolean },
  { name: 'debug', alias: 'd', type: Boolean },
  { name: 'usagelimit', alias: 'u', type: Boolean },
];

async function run() {
  const options = commandLineArgs(OPTION_DEFINITIONS);

  const apiKey = options.key || env.DEEPL_API_KEY;
  const input = options.input || getHtmlFileInFolder();
  let output = options.output;
  const source = options.source;
  const target = options.target || 'EN';
  const logDebug = options.debug;
  const freeApi = options.free || false;
  const displayUsageLimit = options.usagelimit;
  const apiUrl = freeApi ? DEEPL_FREE_API_URL : DEEPL_API_URL;

  if (!apiKey) throw new Error('Specify a DeepL API key as DEEPL_API_KEY environment variable, or using the --key or -k parameter.')
  if (!input) throw new Error('At least specify input file with --input or -i.');

  if (!output) output = input.split('.').slice(0, -1).join('.') + '.' + target.toLowerCase() + '.html';

  log('Input file:', input);
  log('Output file:', output);
  log('Source language:', source || 'Auto detect');
  log('Target language:', target);
  log('Show debug:', logDebug);

  const formData = new FormData();

  formData.append('file', fs.createReadStream('./' + input));
  formData.append('filename', input);

  formData.append('auth_key', apiKey);
  if (source) formData.append('source_lang', source);
  formData.append('target_lang', target);
  formData.append('split_sentences', 0);

  log('Uploading file...');

  try
  {
    const response = await axios.default.post(apiUrl + 'document', formData, { headers: formData.getHeaders() });
    
    if (response.status !== 200) {
      console.error('Request to DeepL failed', response);
      throw new Error(response);
    } else {
      const documentId = response.data.document_id;
      const documentKey = response.data.document_key;

      if (logDebug) debug(documentId, documentKey);

      log('File uploaded, waiting until processed...');
      
      let status = 'queued';
      let secondsRemaining = -1;

      while (status === 'queued' || status === 'translating') {
        const result = await checkProcessingStatus(documentId, documentKey, apiUrl, apiKey);
        status = result.status;
        secondsRemaining = result.secondsRemaining;

        if (secondsRemaining > 0) {
          log('Seconds remaining: ', secondsRemaining);
        }

        await new Promise(r => setTimeout(r, (secondsRemaining || 1) * 1000));
      }

      log ('Downloading translated file...');

      const fileBinaryData = await axios.default.post(apiUrl + 'document/' + documentId + '/result', null,
        { params: { 'auth_key': apiKey, 'document_key': documentKey }, responseType: 'blob' });

      fs.writeFileSync(output, fileBinaryData.data);

      log('Finished.');

      if (displayUsageLimit) {
        log('Requesting usage limit...');

        const usageResponse = await axios.default.get(apiUrl + 'usage', {params: { 'auth_key': apiKey }});

        if (usageResponse.status !== 200) {
          console.error('Request to DeepL failed', usageResponse);
        } else {
          log('Usage:', usageResponse.data.character_count + '/' + usageResponse.data.character_limit,
            Math.round(usageResponse.data.character_count / usageResponse.data.character_limit * 100) + '%');
        }
      }
    }
  } catch (err) { 
    console.error('Translation failed', err);
    throw new Error(err);
  };
}

async function checkProcessingStatus(documentId, documentKey, apiUrl, apiKey) {
  try {
    const result = await axios.default.get(apiUrl + 'document/' + documentId,
      { params: { 'auth_key': apiKey, 'document_key': documentKey } });

    return result.data;
  } catch(err) { 
    console.error('Error retrieving progress', err);
    throw new Error(err);
  };
}

function getHtmlFileInFolder() {
  const files = fs.readdirSync('.');
  for(let i = 0; i < files.length; i++){
    const filename = path.join(files[i]);
    var stat = fs.lstatSync(filename);
    if (!stat.isDirectory() && filename.indexOf('.html') >= 0) {
      return filename;
    };
  }
  return null;
}

function log(...args) {
  console.log(...args);
}

function debug(...args) {
  if (logDebug) console.log(...args);
}

run();