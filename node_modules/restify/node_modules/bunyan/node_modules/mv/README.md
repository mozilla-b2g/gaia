[![Build Status](https://secure.travis-ci.org/superjoe30/node-mv.png)](http://travis-ci.org/superjoe30/node-mv)

Usage:
------

```javascript
var mv;

mv = require('mv');

mv('source/file', 'dest/file', function(err) {
  // done. it tried fs.rename first, and then falls back to
  // piping the source file to the dest file and then unlinking
  // the source file.
});
```
