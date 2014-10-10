/**
 * TODO(gareth): This thing must die.
 */
define(function(require, exports) {
'use strict';

var Provider = require('./provider');

var providers = exports.providers = {};

// Will be injected...
exports.app = null;

exports.get = function(name) {
  if (!providers[name]) {
    providers[name] = new Provider[name]({ app: exports.app });
  }

  return providers[name];
};

});
