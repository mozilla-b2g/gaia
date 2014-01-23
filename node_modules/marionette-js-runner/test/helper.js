var EventEmitter = require('events').EventEmitter,
    fs = require('fs');

global.assert = require('assert');
global.sinon = require('sinon');

// so we can call assert.calledWith
global.sinon.assert.expose(assert, { prefix: '' });

function spawnMocha(argv) {
  var mocha = __dirname + '/../node_modules/.bin/mocha';
  var spawn = require('child_process').spawn;
  return child = spawn(mocha, argv);
}

function spawnMarionette(argv) {
  var bin = __dirname + '/../bin/marionette-mocha';
  var spawn = require('child_process').spawn;
  return child = spawn(bin, argv);
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
