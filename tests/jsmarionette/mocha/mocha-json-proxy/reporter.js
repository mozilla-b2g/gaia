'use strict';
var Base = require('mocha').reporters.Base;

// list of taboo properties to never clone
var TABOO = ['err'];

var EVENTS = [
  'pending',
  'pass',
  'fail',
  'test',
  'test end',
  'suite',
  'suite end',
  'start',
  'end'
];

var ALLOWED_OBJECTS = ['err'];

function write(event, content) {
  var args = Array.prototype.slice.call(arguments);

  if (!process.env[Reporter.FORK_ENV]) {
    process.stdout.write(JSON.stringify(args) + '\n');
    return;
  }

  process.send(['mocha-proxy', args]);
}

function cloneValue(value) {
  switch (typeof value) {
    case 'object':
      return cloneTestObject(value);
    case 'function':
      return value.toString();
  }

  return value;
}

function cloneTestObject(object) {
  var keys = Object.keys(object),
      result = {};

  for (var i = 0, len = keys.length; i < len; i++) {
    var key = keys[i];
    var value = object[key];

    // don't clone taboo properties
    if (TABOO.indexOf(key) !== -1) {
      continue;
    }

    // In order to optimize transmission, don't clone the parent. Annotate its
    // ID so the consumer can correctly re-create the relationship.
    if (key === 'parent') {
      result._parentId = value._id;
      continue;
    }

    // don't copy objects recursively
    if (typeof value === 'object' && ALLOWED_OBJECTS.indexOf(key) === -1) {
      continue;
    }

    result[key] = cloneValue(value);
  }

  return result;
}

function cloneError(err) {
  var result = {
    name: err.name || '',
    stack: err.stack,
    type: err.type || 'Error',
    constructorName: err.constructorName || 'Error',
    expected: err.expected || null,
    actual: err.actual || null
  };

  if (err && 'uncaught' in err) {
    result.uncaught = err.uncaught;
  }

  return result;
}

function defaultHandler(type, runner, payload) {
  return write(type, cloneValue(payload));
}


/**
 * Static object responsible for converting each event type.
 */
var EventHandler = {
  fail: function(event, runner, payload, err) {
    var jsonPayload = cloneValue(payload);
    // remove .err so it does not override the real error.
    if (jsonPayload.err) {
      delete jsonPayload.err;
    }

    write(event, jsonPayload, cloneError(err));
  }
};

function Reporter(runner) {
  var objects = [];
  var ids = 1;

  Base.call(this, runner);

  EVENTS.forEach(function(event) {
    var handler = EventHandler[event] || defaultHandler;
    handler = handler.bind(this, event, runner);
    runner.on(event, function() {
      var args = Array.prototype.slice.call(arguments);
      var runnable = args[0];

      // when we find an object create a unique ID for it.
      if (typeof runnable === 'object' && runnable !== null) {
        var idx = objects.indexOf(runnable);
        if (idx === -1) {
          runnable._id = ids++;
          objects.push(runnable);
        } else {
          // assign a unique objects[idx]._id to the runnable.
          runnable._id = objects[idx]._id;
        }
      }
      handler.apply(this, args);
    }.bind(this));
  }, this);
}

Reporter.write = write;

Reporter.prototype = Object.create(Base.prototype);

Reporter.FORK_ENV = 'MOCHA_PROXY_SEND_ONLY';

module.exports = Reporter;
