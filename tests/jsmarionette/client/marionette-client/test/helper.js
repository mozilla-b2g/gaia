var assert = require('chai').assert;

var helper = global.helper = {};
global.assert = assert;

helper.requireLib = function(path) {
  return require('../lib/' + path);
};

helper.nsFind = function(obj, string) {
  var result = obj;
  var parts = string.split('.');
  var part;
  while (part = parts.shift()) {
    if (!result[part]) {
      throw new Error('Cannot find ' + string + ' in object ');
    }

    result = result[part];
  }

  return result;
};

helper.require = function(path, component, cb) {
  if (typeof(component) === 'function') {
    //new module pattern
    cb = component;
    component = path;

    if (/^support/.test(path)) {
      path = '/test/' + path;
    } else {
      path = '/lib/marionette/' + path;
    }
  } else {
    //old system
    path = '/lib/' + path;
  }

  cb(require('..' + path));
};

helper.require('responder', function(obj) {});

helper.require('example-commands', function(obj) {
  this.exampleCmds = obj;
});

helper.require('support/device-interaction', function(obj) {
  this.DeviceInteraction = obj;
});

helper.require('support/socket', function(obj) {
  this.FakeSocket = obj;
});

helper.require('support/mock-driver', function(obj) {
  this.MockDriver = obj;
});
