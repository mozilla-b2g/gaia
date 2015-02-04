# Fe - mock filesystem in the easist way

Create mock files and directories in the easist way:

```javascript
var fe = require('fe.js'),
    fs = fe.fs;

// Create a 'directory'.
var bar = fe.instance().directory('/foo/bar');

// Create a 'file'.
var charlie = fe.instance().file(bar, 'charlie.json', {'delta': 3.14},
  function(oldContent, content, mode) {

    // This function can return handled content before it got read.
    // You can even convert it as binary data to fit your reader function.
    if ('r' === mode)
      return oldContent.delta;
  });

// Read the file through the path. Would print '3.14'.
console.log( fs.readFileSync('/foo/bar/charlie.json') );
```

The mocked `fs` module can be used with `proxyquire`, which can
substitute the original `fs` module in the test context:

```javascript
// You can find this in '/test/features/supports/world.js'
// Proxyquire: https://github.com/thlorenz/proxyquire
var proxyquire = require('proxyquire')
  , assert     = require('assert')
  , fe         = require( __dirname + '/../../../exports.js')
  , fsStub     = fe.fs
  , wrench = proxyquire('wrench', { 'fs': fsStub });

// Now the `fs` module in the `wrench` would be replaced with our
// mocked one. It would access only the Fe's "filesystem".
```

## Motivation

Sometime we just want to test some simple file handling functions,
and don't want to create real files and directories because:

* It's annoying to remember to remove test files and directories
after tests

* It's annoying to fill the content of dummy files with file APIs

* Forgot to delete files after test may cause some troubles

* Tests should completely live within sandbox. Create files and
directories may cause side-effects on your system

* If your dummy files and directories got affected by other
processes on your system, you may have no chance to know
what's going wrong with your tests

So I create this to implement a filesystem in process memory,
and a mocked `fs` module which has some compatible APIs.

## Unsupported APIs

Right now, some APIs in the `fs` can't be supported due to the complexities.
Some of them are:

* write/read: have no idea about how to support buffer
* truncate/ftruncate: have no idea about how to handle length
* link/symlink: the way I used is hard to create and maintain links

Others are maybe supportable. But I'm lack of time to implement them so far.
So if you want to support more APIs, feedbacks and even patches are welcome.
