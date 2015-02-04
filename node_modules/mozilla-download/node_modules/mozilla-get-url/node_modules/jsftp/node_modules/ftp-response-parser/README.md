# ftp-response-parser

This module provides a fast, lightweight streaming parser for FTP response
format strings.

Given a string like this:

```
211-Features supported:\n
 EPRT\n
 EPSV\n
 MDTM\n
 MLST type*;perm*;size*;modify*;unique*;unix.mode;unix.uid;unix.gid;\n
 REST STREAM\n
 SIZE\n
 TVFS\n
 UTF8\n
211 End FEAT.\n
215 UNIX Type: L8\n
331 Username ok, send password.\n
230 Login successful.\n
200 Type set to: Binary.\n
250 "/test" is the current directory.\n
```

it will stream the following objects:

```javascript
{
  code: 211,
  text: '211-Features supported:\n EPRT\n EPSV\n MDTM\n MLST type*;perm*;size*;modify*;unique*;unix.mode;unix.uid;unix.gid;\n REST STREAM\n SIZE\n TVFS\n UTF8\n211 End FEAT.',
  isMark: false,
  isError: false
}
{
  code: 215,
  text: '215 UNIX Type: L8',
  isMark: false,
  isError: false
}
{
  code: 331,
  text: '331 Username ok, send password.',
  isMark: false,
  isError: false
}
{
  code: 230,
  text: '230 Login successful.',
  isMark: false,
  isError: false
}
{
  code: 200,
  text: '200 Type set to: Binary.',
  isMark: false,
  isError: false
}
{
  code: 250,
  text: '250 "/test" is the current directory.',
  isMark: false,
  isError: false
}
```

## Usage

```javascript

var ResponseParser = require('ftp-response-parser');

var myParser = new ResponseParser();

myParser.on('readable', function() {
  var line;
  while (line = myParser.read()) {
    console.log(line.code); // will emit 215
  }
});

myParser.write('215 UNIX Type: L8');

```

## Install

To get the module, with [npm](https://npmjs.org) do:

```
npm install ftp-response-parser
```

## Test

With [npm](https://npmjs.org) do:

```
npm test
```

## License

MIT
