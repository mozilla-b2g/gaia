define(function(require, exports) {
'use strict';

var debug = require('common/debug')('provider/factory');

var ctors = {
  Caldav: require('./caldav'),
  Local: require('./local')
};

var providers = exports.providers = Object.create(null);

exports.get = function(name) {
  if (!providers[name]) {
    try {
      debug(`Initializing provider ${name}`);
      providers[name] = new ctors[name]();
    } catch (e) {
      console.error('Error', e.name, e.message);
      console.error('Failed to initialize provider', name, e.stack);
    }
  }

  return providers[name];
};

});
