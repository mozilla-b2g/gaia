define(function(require) {
'use strict';

var streamHelper = require('test/support/stream_helper');
var calendar = require('test/support/calendar');
var co = require('ext/co');
var mochaPromise = require('test/support/mocha_promise');
var denodeify = require('common/promise').denodeify;
var threads = require('ext/threads');

var clearStore = denodeify(calendar.clearStore);

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

  mochaPromise(test, 'calling service method', co.wrap(function *() {
    var call = client.method('echo', 'foo', 'bar', 'baz');
    yield expect(call).to.eventually.deep.equal(['foo', 'bar', 'baz']);
  }));

  mochaPromise(test, 'settings', co.wrap(function *() {
    // Set foo = bar.
    yield client.method('settings/set', 'foo', 'bar');
    var stream = client.stream('settings/get', 'foo');
    var result =  streamHelper.assertEventuallyRead(stream, ['bar', 'baz']);
    // Now update foo = baz.
    yield client.method('settings/set', 'foo', 'baz');
    // both bar and baz should be read off the stream.
    yield result;
  }));

  suite('accounts', function() {
    var db;

    mochaPromise(setup, co.wrap(function *() {
      db = calendar.core().db;
      yield db.open();
    }));

    calendar.dbFixtures('account', 'Account', {
      one: { _id: 1, providerType: 'Mock' },
      two: { _id: 2, providerType: 'Mock' }
    });

    mochaPromise(teardown, co.wrap(function *() {
      yield clearStore(db, ['accounts']);
      db.close();
    }));

    mochaPromise(test, 'should get written', co.wrap(function *() {
      var stream = client.stream('accounts/list');
      yield streamHelper.assertEventuallyRead(stream, [
        [ { _id: 1 }, { _id: 2 } ]
      ]);
    }));

    mochaPromise(test, 'deleting should update', co.wrap(function *() {
      var stream = client.stream('accounts/list');
      var result = streamHelper.assertEventuallyRead(stream, [
        [ { _id: 1, providerType: 'Mock' }, { _id: 2, providerType: 'Mock' } ],
        // Only 2 should remain after 1 is deleted
        [ { _id: 2, providerType: 'Mock' } ]
      ]);

      yield client.method('accounts/remove', 1);
      yield result;
    }));
  });
});

});
