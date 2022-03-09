# DeepL json translator

Node.js CLI tool to translate .json files using the DeepL API. Requires a [DeepL API key](https://www.deepl.com/nl/docs-api/).

Allows selecting which properties to translate.

## Installation

    npm install

## Usage

    node index [options]

### Options

- **--input** / **-i**: The input file. If left blank, uses the first .json file in the directory.
- **--output** / **-o**: The output file. If left blank, appends the target language to the source's file name. E.g. source file texts.json would become texts.fr.json if the target language is French.
- **--source** / **-s**: The source language. One of the [DeepL language strings](https://www.deepl.com/docs-api/translating-text/request/). Default auto-detect.
- **--target** / **-t**: The target language. One of the [DeepL language strings](https://www.deepl.com/docs-api/translating-text/request/). Default FR.
- **--key** / **-k**: Your DeepL API key. Can also be set as environment variable `DEEPL_API_KEY`.
- **--formal** / **-f**: Flag. DeepL setting: prefer formal language. Default false.
- **--debug** / **-d**: Flag. Also log debug statements. Default false.
- **--usagelimit** / **-u**: Flag. Display your DeepL API key's usage limit after use.