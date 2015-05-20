'use strict';
/**
Custom marionette-runner interface for mocha.
*/

/**
 * Module dependencies.
 */

var Suite = require('mocha/lib/suite');
var HostManager = require('./runtime/hostmanager').HostManager;
var RPC = require('./rpc');
var Test = require('mocha/lib/test');
var escapeRe = require('escape-string-regexp');

function MarionetteTest(title, hostManager, fn) {
  this.hostManager = hostManager;
  Test.call(this, title, fn);
}

MarionetteTest.prototype = {
  __proto__: Test.prototype,

  run: function(fn) {
    return Test.prototype.run.call(this, function(err) {
      if (err) {
        // In the case of an error we attempt to run host/client specific error
        // handles where possible so first we attempt to see if there is a host
        // that matches a client...
        if (!this.ctx.hosts.length && this.ctx.hosts.length || !err.client) {
          return fn(err);
        }

        var hosts = this.ctx.hosts;

        // attempt to find the correct host...
        var host;
        for (var i = 0; i < hosts.length; i++) {
          if (
            // In the case of direct match then we found it...
            hosts[i].client === err.client ||
            // The client's scope method creates prototype chains so if it is in
            // the same chain it is also a match...
            hosts[i].client.isPrototypeOf(err.client)
          ) {
            host = hosts[i];

            host.session.checkError(host.profileConfig, err)
              .then(fn)
              .catch (fn);

            break;
          }
        }
        return;
      }
      fn();
    }.bind(this));
  }
};

/**
@param {Object} suite root suite for mocha.
*/
module.exports = function(suite) {
  // initialize the RPC bridge...
  var rpc = new RPC(process.send.bind(process));
  process.on('message', rpc.handle());

  var suites = [suite];
  var manager = new HostManager();

  // setup global hooks
  suite.beforeAll('marionette-mocha global init', function() {
    this.hosts = [];
    this.runner = rpc.client('runner', ['createHost', 'createProfile']);
  });

  suite.on('pre-require', function(context, file, mocha) {
    /**
     * Execute before each test case.
     */
    context.setup = function(name, fn) {
      suites[0].beforeEach(name, fn);
    };

    /**
     * Execute after each test case.
     */
    context.teardown = function(name, fn) {
      suites[0].afterEach(name, fn);
    };

    /**
     * Execute before the suite.
     */
    context.suiteSetup = function(name, fn) {
      suites[0].beforeAll(name, fn);
    };

    /**
     * Execute after the suite.
     */
    context.suiteTeardown = function(name, fn) {
      suites[0].afterAll(name, fn);
    };

    /**
     * Describe a "suite" with the given `title`
     * and callback `fn` containing nested suites
     * and/or tests.
     */
    context.suite = function(title, fn) {
      var suite = Suite.create(suites[0], title);
      suite.file = file;
      suites.unshift(suite);
      fn.call(suite);
      suites.shift();
      return suite;
    };

    context.marionette = context.suite;

    /**
     * global state modifies for marionette
     *
     * @type {Object}
     */
    // Setup global state manager for the marionette runtime.
    manager.desiredCapabilities = decode('DESIRED_CAPABILITIES');
    manager.verbose = decode('VERBOSE') === '1';
    manager.deviceType = decode('DEVICE_TYPE');
    context.marionette._manager = manager;
    context.marionette.client = manager.createHost.bind(manager);
    context.marionette.plugin = manager.addPlugin.bind(manager);

    /**
     * Pending suite.
     */
    context.suite.skip = function(title, fn) {
      var suite = Suite.create(suites[0], title);
      suite.pending = true;
      suites.unshift(suite);
      fn.call(suite);
      suites.shift();
    };

    /**
     * Exclusive test-case.
     */
    context.suite.only = function(title, fn) {
      var suite = context.suite(title, fn);
      mocha.grep(suite.fullTitle());
    };

    /**
     * Describe a specification or test-case
     * with the given `title`, `options` list device to run on,
     * and callback `fn` acting as a thunk.
     */
    context.test = function(title, options, fn) {
      // Second argument is optional, put default device if it doesn't exist.
      if (typeof(options) === 'function') {
        fn = options;
        options = { devices: ['phone'] };
      }

      // Filter out test suites if device type is not in devices list
      if (manager.deviceType && options && options.devices &&
          options.devices.indexOf(manager.deviceType) < 0) {
            return;
      }

      var suite = suites[0];
      if (suite.pending) fn = null;
      var test = new MarionetteTest(title, manager, fn);
      test.file = file;
      suite.addTest(test);
      return test;
    };

    /**
     * Exclusive test-case.
     */
    context.test.only = function(title, fn) {
      var test = context.test(title, fn);
      var reString = '^' + escapeRe(test.fullTitle()) + '$';
      mocha.grep(new RegExp(reString));
    };

    /**
     * Pending test case.
     */
    context.test.skip = function(title) {
      context.test(title);
    };
  });
};

function decode(name) {
  var encoded = process.env[name];
  if (!encoded) {
    return null;
  }

  var result;
  try {
    result = JSON.parse(new Buffer(encoded, 'base64').toString());
  } catch (error) {
    console.error('Could not parse', name, encoded);
    result = null;
  }

  return result;
}
