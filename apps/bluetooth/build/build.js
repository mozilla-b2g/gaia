'use strict';

/* global require, exports, dump */
var utils = require('utils');

var BluetoothAppBuilder = function() {
};

BluetoothAppBuilder.prototype.execute = function(options) {
  var optimize = 'optimize=' +
    (options.GAIA_OPTIMIZE === '1' ? 'uglify2' : 'none');
  var configFile = utils.getFile(options.APP_DIR, 'build',
    'bluetooth.build.jslike');
  var r = require('r-wrapper').get(options.GAIA_DIR);
  r.optimize([configFile.path, optimize], function() {
    dump('require.js optimize ok\n');
  }, function(err) {
    dump('require.js optmize failed:\n');
    dump(err + '\n');
  });
};

exports.execute = function(options) {
  (new BluetoothAppBuilder()).execute(options);
};
