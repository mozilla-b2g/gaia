'use strict';
var EventEmitter = require('events').EventEmitter;
var assert = require('chai').assert;
var spawn = require('child_process').spawn;

global.assert = assert;
global.sinon = require('sinon');

// so we can call assert.calledWith
global.sinon.assert.expose(assert, { prefix: '' });

function env() {
  var vars = {};
  for (var key in process.env) vars[key] = process.env[key];
  vars.MOCHA_COLORS = '0';
  return vars;
}

function spawnMocha(argv) {
  var mocha = __dirname + '/../../../../../node_modules/.bin/mocha';
  return spawn(mocha, argv, { env: env() });
}

function spawnMarionette(argv) {
  var bin = __dirname + '/../bin/marionette-mocha';
  argv.push('--runtime');
  argv.push(__dirname + '/../../../../../b2g/b2g-bin');
  return spawn(bin, argv, { env: env() });
}

function mockProcessSend() {
  var refs = {},
      originalSend;

  // spy on process.send
  setup(function() {
    var sent = refs.sent = new EventEmitter();
    originalSend = process.send;

    process.send = function(event) {
      if (Array.isArray(event) && typeof event[0] === 'string') {
        sent.emit.apply(sent, event);
      }

      // if there is a send method use it.
      if (originalSend) {
        originalSend.apply(this, arguments);
      }
    };
  });

  teardown(function() {
    process.send = originalSend;
  });

  return refs;
}

global.mockProcessSend = mockProcessSend;
global.spawnMocha = spawnMocha;
global.spawnMarionette = spawnMarionette;
