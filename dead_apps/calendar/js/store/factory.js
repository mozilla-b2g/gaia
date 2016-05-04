define(function(require, exports) {
'use strict';

var debug = require('common/debug')('store/factory');

var ctors = {
  Account: require('./account'),
  Alarm: require('./alarm'),
  Busytime: require('./busytime'),
  Calendar: require('./calendar'),
  Event: require('./event'),
  IcalComponent: require('./ical_component'),
  Setting: require('./setting')
};

exports._instances = Object.create(null);

exports.get = function(name) {
  if (!exports._instances[name]) {
    try {
      debug(`Initializing store ${name}`);
      exports._instances[name] = new ctors[name]();
    } catch (e) {
      console.error('Error', e.name, e.message);
      console.error('Failed to initialize store', name, e.stack);
    }
  }
  return exports._instances[name];
};

});
