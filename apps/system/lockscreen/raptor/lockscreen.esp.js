'use strict';

module.exports = function(filepath, outpath, requiredir) {
  var opts = {};
  if (outpath) {
    var fs = require('fs');
    opts.writer = {
      write: function(advice) {
        var code = advice.code;
        fs.writeFile(outpath, code);
      }
    };
  }
  var Espect = require(requiredir + 'espect.js');
  var espect = new Espect(opts);
  espect
    .select(filepath + ' LockScreen.prototype.unlock')
    .before(function() {
      Performance.mark('LockScreen#unlock');
    })
    .done()
  .done();
};
