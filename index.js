require('./flatmap');
const commandLineArgs = require('command-line-args');
const path = require('path')
const fs = require('fs');
const axios = require('axios');
const { env } = require('process');

const DEEPL_API_URL = 'https://api.deepl.com/v2/';

const optionDefinitions = [
  { name: 'input', alias: 'i', type: String },
  { name: 'output', alias: 'o', type: String },
  { name: 'source', alias: 's', type: String },
  { name: 'target', alias: 't', type: String },
  { name: 'key', alias: 'k', type: String },
  { name: 'formal', alias: 'f', type: Boolean },
  { name: 'debug', alias: 'd', type: Boolean },
  { name: 'usagelimit', alias: 'u', type: Boolean },
];

const options = commandLineArgs(optionDefinitions);

const key = options.key || env.DEEPL_API_KEY;
const input = options.input || getJsonFileInFolder();
let output = options.output;
const source = options.source;
const target = options.target || 'FR';
const formality = options.formal ? 'more' : 'less';
const logDebug = options.debug;
const displayUsageLimit = options.usagelimit;

if (!key) throw new Error('Specify a DeepL API key as DEEPL_API_KEY environment variable, or using the --key or -k parameter.')
if (!input) throw new Error('At least specify input file with --input or -i.');

if (!output) output = input.split('.').slice(0, -1).join('.') + '.' + target.toLowerCase() + '.json';

log('Input file:', input);
log('Output file:', output);
log('Source language:', source || 'Auto detect');
log('Target language:', target);
log('Formality:', formality);
log('Show debug:', logDebug);

log('Compiling entries...');

const allInputAsText = fs.readFileSync(input).toString();

if (!allInputAsText || allInputAsText.length === 0 || isNaN(allInputAsText.charAt(0))) throw new Error('Does not look like a json file');

const entries = [];

const params = new URLSearchParams();
params.append('auth_key', key);
if (source) params.append('source_lang', source);
params.append('target_lang', target);
params.append('split_sentences', 0);
params.append('formality', formality);

const entriesToTranslate = entries.forEach(e => {
  params.append('text', e.text);
});

log('Translating...');

axios.default.post(DEEPL_API_URL + 'translate', params.toString())
  .then((response) => {
    if (response.status !== 200) {
      console.error('Request to DeepL failed', response);
      throw new Error(response.data);
    } else {
      const translations = response.data.translations.map(t => t.text);
      debug(translations);

      log('Done, writing file...');
      //fs.writeFileSync(output, targetEntries.reduce((p, c) => p + c.toText(), ''));
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

function getJsonFileInFolder() {
  const files = fs.readdirSync('.');
  for(let i = 0; i < files.length; i++){
    const filename = path.join(files[i]);
    var stat = fs.lstatSync(filename);
    if (!stat.isDirectory() && filename.indexOf('.json') >= 0) {
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
