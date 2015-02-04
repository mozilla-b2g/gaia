# dive

a tiny module for node that is able to recursively walk (_“dive”_) a
directory tree. There’s also an synchronous version of dive called
[diveSync](//github.com/pvorb/node-diveSync).

~~~ javascript
dive(directory[, options], action[, complete]);
~~~

*   `directory` is the pathname of a readable directory.
*   `options` [optional] is an object that defines some of the properties.

    The default options are as follows:

    ~~~ javascript
    {
      recursive: true,    // - If set to false, this will ignore subdirectories.
      all: false,         // - If set to true, this will show "dot files" and
                          //   files in "dot directories", e.g. ".gitignore" or
                          //  ".git/HEAD".
      directories: false  // - If set to true, this will call `action` on
                          //   directories, too.
      files: true         // - If set to false, this won't call `action` on
                          //   files any more.
    }
    ~~~
*   `action` is passed two arguments `(err, file)` where `err` is an error or
    `null` and `file` is the pathname of a file.
*   `complete [optional]` may define a second callback, that is called, when all
    files have been processed. It takes no arguments.

## Installation

    npm install dive

## Usage

Default:

~~~ javascript
var dive = require('dive');

dive(process.cwd(), function(err, file) {

});
~~~

All files and a callback in the end:

~~~ javascript
var dive = require('dive');

dive(process.cwd(), { all: true }, function(err, file) {
  if (err) throw err;
  console.log(file);
}, function() {
  console.log('complete');
});
~~~

Directories only:

~~~ javascript
var dive = require('dive');

dive(process.cwd(), { directories: true, files: false }, function(err, dir) {
  if (err) throw err;
  console.log(dir);
});
~~~

## Bugs and Issues

If you encounter any bugs or issues, feel free to
[open an issue at github](//github.com/pvorb/node-dive/issues) or send me an
email to <paul@vorb.de>. I also always like to hear from you, if you’re using my
code.

## License

(The MIT License)

Copyright © 2011-2012 Paul Vorbach

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the “Software”), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
