/* global MockNavigatorDatastore, MockDatastore, Promise,
 SyncDataStore, InMemoryStore */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/shared/js/sync_datastore.js');

suite('Sync Datastore', function() {
  var subject;
  var realDatastore;
  var promiseDone = Promise.resolve({ operation: 'done' });
  var operations;
  var persist;

  suiteSetup(function() {
    realDatastore = navigator.getDataStores;
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
    MockNavigatorDatastore._records = {};

    operations = [
      {
        operation: 'add',
        data: {
          url: 'http://mozilla.org',
          title: 'homepage'
        },
        revisionId: 1
      },
      {
        operation: 'add',
        data: {
          url: 'http://fsf.org',
          title: 'fsf'
        },
        revisionId: 2
      },
      {
        operation: 'update',
        data: {
          url: 'http://fsf.org',
          title: 'Free Software Foundation'
        },
        revisionId: 3
      },
      {
        operation: 'add',
        data: {
          url: 'http://example.com',
          title: 'example'
        },
        revisionId: 4
      },
      {
        operation: 'remove',
        target: {
          id: 'http://example.com'
        },
        revisionId: 5
      },
    ];

    MockDatastore.sync = function() {
      var index = 0;
      function returnOp(i) {
        return i < operations.length ?
         Promise.resolve(operations[i]) : promiseDone;
      }

      var cursor = {
        next: function() {
          return returnOp(index++);
        }
      };
      return cursor;
    };
  });

  setup(function() {
    persist = new InMemoryStore();
    subject = new SyncDataStore('storeName', persist, 'url');
  });

  suiteTeardown(function() {
    navigator.getDataStores = realDatastore;
  });

  suite('Synchronisation', function() {
    test('load all data in memory', function(done) {
      subject.sync().then(function() {
        assert.isNotNull(persist.results);
        assert.lengthOf(Object.keys(persist.results), 2);
        assert.equal(persist.results['http://mozilla.org'].title, 'homepage');
        assert.equal(persist.results['http://fsf.org'].title,
         'Free Software Foundation');
        assert.isTrue(!('http://example.com' in persist.results));
        done();
      });
    });
  });

  suite('Filter', function() {
    setup(function(done) {
      subject.filter = function(data) {
        return data.url.indexOf('http://m') !== 0;
      };
      subject.sync().then(done);
    });
    test('filter results', function() {
      assert.isNotNull(persist.results);
      assert.lengthOf(Object.keys(persist.results), 1);
      assert.equal(persist.results['http://mozilla.org'].title, 'homepage');
    });
  });
});
