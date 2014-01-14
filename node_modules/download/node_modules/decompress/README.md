# decompress [![Build Status](https://secure.travis-ci.org/kevva/decompress.png?branch=master)](http://travis-ci.org/kevva/decompress)

Easily extract `.zip`, `.tar` and `.tar.gz` archives. Based on the extract 
utility in [Bower](https://github.com/bower/bower).

## Getting started

Install with [npm](https://npmjs.org/package/decompress): `npm install decompress`

## Examples

You'll only need to pass a type into `ext` and it'll figure the rest out for 
you.

```js
var decompress = require('decompress');
var fs = require('fs');

var src = fs.createReadStream('foo.tar.gz');
var dest = decompress.extract({ ext: '.tar.gz' });

src.pipe(dest);
```

## API

### .extract(opts)

Extract an archive using the `ext` option to determine which extractor to use. 
If no `path` is specified it'll extract it to your current location.

### .canExtract(src, mime)

Determine if a file can be extracted or not by checking the file extension 
and/or the MIME type.

```js
decompress.canExtract('foo.zip');
// => true

decompress.canExtract('application/zip');
// => true
```

## Options

### `ext`

Type: `String`  
Default: `''`

String that can be a file name, URL, MIME type etc.

### `path`

Type: `String`  
Default: `process.cwd()`

Path to extract the archive to. If no `path` is defined it'll extract it to your 
current location.

### strip

Type: `Number`  
Default: `0`

Equivalent to `--strip-components` for tar.

## License

[MIT License](http://en.wikipedia.org/wiki/MIT_License) (c) [Kevin Mårtensson](http://kevinmartensson.com)
