# dmg

Mount & unmount .dmg files on your system.
Wrapper around hdiutil which must be present on your system.

Only works on OSX (tested on 10.7).

## Usage

```js
var dmg = require('dmg');
var fs = require('fs');

// path must be absolute and the extension must be .dmg
var myDmg = '/User/foo/foo.dmg'; 

// to open & mount the dmg
dmg.mount(myDmg, function(err, path) {
  // show all files in dmg
  console.log(fs.readdirSync(path));
});

// later you can and should unmount
dmg.unmount(mountedDmg, function(err) {
  //...
});

```

## License

The MIT License (MIT)

Copyright (c) 2013 Sahaja James Lal

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
