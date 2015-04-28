define(function(require) {
'use strict';

var mochaPromise = require('test/support/mocha_promise');
var threads = require('ext/threads');

suite('calendar service', function() {
  var thread, client;

  setup(function() {
    thread = threads.create({
      src: '/js/backend/calendar_service.js',
      type: 'worker'
    });

    client = threads.client('calendar', { thread: thread });
  });

  teardown(function() {
    thread.destroy();
  });

  mochaPromise(test, 'client can connect', function() {
    return client.method('start').then(() => assert.ok(client.connected));
  });
});

});
