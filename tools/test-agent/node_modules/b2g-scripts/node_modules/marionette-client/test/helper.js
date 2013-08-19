(function() {

  if (typeof(window) === 'undefined') {
    expect = require('expect.js');
    context = global;
  } else {
    context = window;
    context.require('../vendor/expect.js');
  }

  //always load test-agent for now

  cross = {
    isNode: typeof(window) === 'undefined',

    nsFind: function(obj, string) {
      var result = obj,
          part,
          parts = string.split('.');

      while ((part = parts.shift())) {
        if (result[part]) {
          result = result[part];
        } else {
          throw new Error('Cannot find ' + string + ' in object ');
        }
      }
      return result;
    },

    requireTestAgent: function(path, component, cb) {
      var container = {},
          prefix = 'test-agent/lib/';

      if (cross.isNode) {
        cb(this.nsFind(require(prefix + path), component));
      } else {
        context.require('../vendor/test-agent.js', function() {
          cb(this.nsFind(context, component));
        }.bind(this));
      }

    },

    require: function(path, component, cb) {

      if (!path.match(/.js$/)) {
        path += '.js';
      }

      if (path.indexOf('test-agent') === 0) {
        return this.requireTestAgent.apply(this, arguments);
      }

      path = '../lib/' + path;

      if (cross.isNode) {
        cb(this.nsFind(require(path), component));
      } else {
        context.require(path, function() {
          cb(this.nsFind(context, component));
        }.bind(this));
      }
    }
  };

  //Universal utils for tests.
  //will be loaded for all tests and available
  //in static scope inside and outside of tests.
  cross.require(
    'marionette/example-commands',
    'Marionette.ExampleCommands',
    function(obj) {
      context.exampleCmds = obj;
    }
  );

  cross.require(
    '../test/support/device-interaction',
    'DeviceInteraction',
    function(obj) {
      context.DeviceInteraction = obj;
    }
  );

  cross.require(
    '../test/support/fake-xhr',
    'FakeXhr',
    function(obj) {
      context.FakeXhr = obj;
    }
  );

  cross.require(
    '../test/support/mock-driver',
    'MockDriver',
    function(obj) {
      context.MockDriver = obj;
    }
  );

}.call(this));
