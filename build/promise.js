const { Cu } = require('chrome');
Cu.import('resource://gre/modules/Promise.jsm');

exports.execute = function(options) {
  var p = new Promise(function(resolve) {
    dump('resolved\n');
  });
}
