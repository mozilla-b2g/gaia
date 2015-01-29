# font-fit [![](https://travis-ci.org/gaia-components/font-fit.svg)](https://travis-ci.org/gaia-components/font-fit)

A fast, lightweight library for sizing text-content to fit.

## Demo

- [Demo](http://gaia-components.github.io/font-fit/)

## Installation

```bash
$ bower install gaia-components/font-fit
```

## Usage

```js
var result = fontFit({
  text: 'hello world',
  font: 'italic 24px arial',
  space: myElement.clientWidth, // space for text,
  min: 16, // min font-size (optional)
  max: 24 // max font-size (optional)
});

myElement.style.fontSize = result.fontSize + 'px';
```

## Tests

1. Ensure Firefox Nightly is installed on your machine.
2. `$ npm install`
3. `$ npm test`

If your would like tests to run on file change use:

`$ npm run test-dev`
