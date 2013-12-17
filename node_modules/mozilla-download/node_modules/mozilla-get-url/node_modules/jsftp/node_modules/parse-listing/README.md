## parse-listing [![Build Status](https://secure.travis-ci.org/sergi/parse-listing.png)](http://travis-ci.org/sergi/parse-listing)

Simple library that parses file listing input for different platforms. An
example file listing is the output of the `ls` command in unix, or the `dir`
command in DOS/Windows platforms.

## Example

```javascript
var Parser = require("parse-listing");

// Yeah yeah, multiline strings would make Crockford mad, I know.
var str = "drwxr-xr-x    5 1001     1001         4096 Jan 09 11:52 .\r\n\
drwxr-xr-x    4 0        0            4096 Sep 19 13:50 ..\r\n\
-rw-------    1 1001     1001         1118 Jan 09 12:09 .bash_history\r\n\
-rw-------    1 1001     1001          943 Jan 09 11:52 .viminfo\r\n\
drwxrwxr-x    5 1001     1001         4096 Jan 09 11:52 inaccessible\r\n\
drwxrwxrwx    2 1001     1001         4096 Sep 21 11:20 project1\r\n\
drwx------    2 1001     1001         4096 Oct 19 16:17 project2\r\n";

Parser.parseEntries(str, function(err, entryArray) {
  entryArray.forEach(function(entry, i) {
    console.log("Name:",entry.name);
    console.log("Type", entry.type);
    console.log("Size:", entry.size);
  });
});
```

The example above will print the name, type and size for every entry in the
listing. A parsed line becomes a JavaScript object like this:

```javascript
  {
    type: 1,
    size: 4096,
    name: "project2",
    time: 1382192220000,
    owner: "1001",
    group: "1001",

    userPermissions: {
      read: true,
      write: true,
      exec: true
    },

    groupPermissions: {
      read: false,
      write: false,
      exec: false
    },

    otherPermissions: {
      read: false,
      write: false,
      exec: false
    }
  }
```

## Methods

### parseEntries(string | array, callback)

Asynchronously parses a list of entries either in a single string (entries will
be split by newlines) or in an array of strings. Invokes the callback when all
the entries have been processed, and passes an array of JavaScript objects.

### parseEntry(string)

Parses a single string such as:

`drwxrwxrwx    2 1001     1001         4096 Sep 21 11:20 project`

and returns the JavaScript object for it. There is no need to specify whether the
entry is in UNIX or MS-DOS/Windows format. The parser will find out by itself.

## Installation

With NPM:

    npm install parse-listing

From GitHub:

    git clone https://github.com/sergi/parse-listing.git

## License

The MIT License

Copyright(c) 2013 Sergi Mansilla <sergi.mansilla AT gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.




