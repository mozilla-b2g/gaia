# download [![Build Status](https://secure.travis-ci.org/kevva/download.png?branch=master)](http://travis-ci.org/kevva/download)

Download and extract files effortlessly in Node.js.

## Getting started

Install with [npm](https://npmjs.org/package/download): `npm install download`

## Examples

If you're fetching an archive you can set `extract: true` in options and 
it'll extract it for you.

```js
var download = require('download');

// download and extract `foo.tar.gz` into `bar/`
download('foo.tar.gz', 'bar', { extract: true });

// download and save `foo.exe` into `bar/foo.exe` with mode `0755`
download('foo.exe', 'bar', { mode: '0755' });

// download and save an array of files in `bar/`
var files = ['foo.jpg', 'bar.jpg', 'cat.jpg'];
download(files, 'bar');
```

## API

### download(url, dest, opts)

Download a file or an array of files to a given destination. Returns an EventEmitter 
with three possible events — `response`, `data` and `error`.

## Options

* `extract` — If set to `true`, try extracting the file using [decompress](https://github.com/kevva/decompress/)
* `mode` — Set mode on the downloaded files
* `strip` — Equivalent to `--strip-components` for tar

You can also define options accepted by the [request](https://github.com/mikeal/request/) module.

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License) (c) [Kevin Mårtensson](http://kevinmartensson.com)
