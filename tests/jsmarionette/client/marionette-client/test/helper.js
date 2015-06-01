'use strict';
var assert = require('chai').assert;

var helper = global.helper = {};
global.assert = assert;

var deepEqual = assert.deepEqual.bind(assert);
assert.deepEqual = function(one, other, msg) {
  // Hack so that we pass when comparing
  // { '0': foo } with [foo]
  deepEqual(argsToArrays(one), argsToArrays(other), msg);
};

function argsToArrays(obj) {
  if (typeof obj !== 'object') {
    return obj;
  }

  var proto;
  try {
    proto = Object.getPrototypeOf(obj);
    if (proto && Object.keys(proto).length) {
      // This is something fancy...
      return obj;
    }
  } catch (err) {
    // uh wtf
    return obj;
  }

  if (!Array.isArray(obj) && isArrayLike(obj)) {
    obj = Array.prototype.slice.call(obj);
  }

  for (var key in obj) {
    obj[key] = argsToArrays(obj[key]);
  }

  return obj;
}

function isArrayLike(obj) {
  return Object.keys(obj).every(function(value) {
    var representation = parseInt(value);
    return typeof representation === 'number' && !isNaN(representation);
  });
}

helper.requireLib = function(path) {
  return require('../lib/' + path);
};

helper.nsFind = function(obj, string) {
  var result = obj;
  var parts = string.split('.');
  var part;
  while ((part = parts.shift())) {
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
  global.exampleCmds = obj;
});

helper.require('support/device-interaction', function(obj) {
  global.DeviceInteraction = obj;
});

helper.require('support/socket', function(obj) {
  global.FakeSocket = obj;
});

helper.require('support/mock-driver', function(obj) {
  global.MockDriver = obj;
});
