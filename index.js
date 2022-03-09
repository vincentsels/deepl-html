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

  const key = options.key || env.DEEPL_API_KEY;
  const input = options.input || getHtmlFileInFolder();
  let output = options.output;
  const source = options.source;
  const target = options.target || 'FR';
  const formality = options.formal ? 'more' : 'less';
  const logDebug = options.debug;
  const freeApi = options.free || false;
  const displayUsageLimit = options.usagelimit;

  if (!key) throw new Error('Specify a DeepL API key as DEEPL_API_KEY environment variable, or using the --key or -k parameter.')
  if (!input) throw new Error('At least specify input file with --input or -i.');

  if (!output) output = input.split('.').slice(0, -1).join('.') + '.' + target.toLowerCase() + '.html';

  log('Input file:', input);
  log('Output file:', output);
  log('Source language:', source || 'Auto detect');
  log('Target language:', target);
  log('Formality:', formality);
  log('Show debug:', logDebug);

  const formData = new FormData();

  formData.append('file', fs.createReadStream('./' + input));
  formData.append('filename', input);

  formData.append('auth_key', key);
  if (source) formData.append('source_lang', source);
  formData.append('target_lang', target);
  formData.append('split_sentences', 0);
  formData.append('formality', formality);

  log('Uploading file...');

  axios.default.post(freeApi ? DEEPL_FREE_API_URL : DEEPL_API_URL + 'document', formData, { headers: formData.getHeaders() })
    .then((response) => {
      if (response.status !== 200) {
        console.error('Request to DeepL failed', response);
        throw new Error(response);
      } else {
        const documentId = response.document_id;
        const documentKey = response.document_key;

        debug(documentId, documentKey);

        log('File uploaded, waiting until processed...');
        
        let status = 'queued';

        while (status === 'queued' || status === 'translating') {

        }

        log('Finished.');

        if (displayUsageLimit) {
          log('Requesting usage limit...');
          axios.default.get(DEEPL_API_URL + 'usage', {params: { 'auth_key': key }})
          .then((response) => {
            if (response.status !== 200) {
              console.error('Request to DeepL failed', response);
            } else {
              log('Usage:', response.data.character_count + '/' + response.data.character_limit,
                Math.round(response.data.character_count / response.data.character_limit * 100) + '%');
            }
          }).catch((err) => { 
            console.error('Error retrieving usage limit', err);
            throw new Error(err);
          });
        }
      }
    })
    .catch((err) => { 
      console.error('Translation failed', err);
      throw new Error(err);
    });
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
