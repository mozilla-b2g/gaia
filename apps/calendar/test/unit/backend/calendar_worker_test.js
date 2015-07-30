define(function(require) {
'use strict';

var mochaPromise = require('test/support/mocha_promise');
var threads = require('ext/threads');

suite('calendar service', function() {
  var thread, client;

  setup(function() {
    thread = threads.create({
      src: '/js/backend/calendar_worker.js',
      type: 'worker'
    });

    client = threads.client('calendar', { thread: thread });
  });

  teardown(function() {
    thread.destroy();
  });

  mochaPromise(test, 'calling service method', function() {
    var call = client.method('echo', 'foo', 'bar', 'baz');
    return expect(call).to.eventually.deep.equal([
      'foo',
      'bar',
      'baz'
    ]);
  });
});

});
