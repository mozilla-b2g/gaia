/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* global
  asyncStorage,
  DataAdapters,
  ERROR_SYNC_APP_RACE_CONDITION,
  HISTORY_COLLECTION_MTIME,
  HISTORY_LAST_REVISIONID,
  HISTORY_SYNCTOID_PREFIX,
  HistoryHelper,
  MockasyncStorage,
  MockDatastore,
  MockLazyLoader,
  MockNavigatorDatastore
*/

require('/shared/js/sync/errors.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/apps/system/test/unit/mock_asyncStorage.js');
requireApp('sync/js/adapters/history.js');

window.DataAdapters = {};

suite('sync/adapters/history >', function() {
  var realDatastore, realLazyLoader, realAsyncStorage, testCollectionData;
  var dataStoreRemoveSpy;

  var kintoCollection = {
    list() {
      return Promise.resolve({
        data: testCollectionData
      });
    }
  };

  function getPlacesStore() {
    return navigator.getDataStores().then(stores => {
      return Promise.resolve(stores[0]);
    });
  }

  function verifyPlaces(collectionItem, placesItem) {
    var payload = collectionItem.payload;
    assert.equal(payload.histUri, placesItem.url);
    assert.equal(payload.title, placesItem.title);
    for (var i = 0; i < payload.visits.length; i++) {
      assert.equal(payload.visits[i].date, placesItem.visits[i] * 1000);
    }
    assert.equal(payload.id, placesItem.fxsyncId);
  }

  function testDataGenerator(initIndex, initDate, count) {
    var list = [];
    for (var i = initIndex; i < initIndex + count; i++) {
      var visits = [];
      var startData = initDate + i * 100;
      for (var j = 0; j < 3; j++) {
        // Visits from FxSync will be in anti-chronological order
        visits.unshift({
          date: (startData + j * 10) * 1000, type: 3
        });
      }

      list.unshift({
        id: 'UNIQUE_ID_' + i,
        last_modified: initDate + i * 10,
        payload: {
          id: 'UNIQUE_ID_' + i,
          histUri: 'http://example' + i + '.com/',
          title: 'Example ' + i + ' Title',
          visits: visits
        }
      });
    }
    return list;
  }

  suiteSetup(() => {
    realDatastore = navigator.getDataStores;

    realAsyncStorage = window.asyncStorage;
    window.asyncStorage = MockasyncStorage;

    realLazyLoader = window.LazyLoader;
    window.LazyLoader = MockLazyLoader;
  });

  suiteTeardown(() => {
    navigator.getDataStores = realDatastore;

    window.LazyLoader = realLazyLoader;

    window.asyncStorage = realAsyncStorage;
  });

  setup(() => {
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
    dataStoreRemoveSpy = sinon.spy(MockDatastore, 'remove');
    testCollectionData = [];
    MockDatastore._tasks[1].revisionId = 'latest-not-cleared';
  });

  teardown(() => {
    dataStoreRemoveSpy.restore();
    MockDatastore._inError = false;
    MockDatastore._records = Object.create(null);
    window.asyncStorage.mTeardown();
  });

  test('update - empty records', function(done) {
    var historyAdapter = DataAdapters.history;
    historyAdapter.update(kintoCollection, { readonly: true, userid: 'foo' })
        .then((result) => {
      assert.equal(result, false);
      assert.equal(asyncStorage.mItems['foo' + HISTORY_LAST_REVISIONID],
          'latest-not-cleared');
    }).then(done, reason => {
      assert.ok(false, reason);
    });
  });

  ['clear', 'remove'].forEach(task => {
    suite(`after a DataStore ${task}`, function() {
      suiteSetup(function() {
        MockDatastore._taskCounter = 0;
        MockDatastore._tasks = [
          {
            operation: 'clear',
            id: 0,
            data: {}
          },
          {
            operation: 'add',
            id: 0,
            data: {}
          },
          {
            operation: task,
            id: 0,
            data: {}
          },
          {
            operation: 'done',
            id: 0,
            revisionId: `latest-after-${task}`,
            data: null
          }
        ];
      });
      suiteTeardown(function() {
        MockDatastore._taskCounter = 0;
        MockDatastore._tasks = [
          {
            operation: 'update',
            id: 0,
            data: {}
          },
          {
            operation: 'done',
            id: 0,
            data: null,
            revisionId: 'latest-not-cleared'
          }
        ];
      });

      test('update - refills the DataStore', function(done) {
        var historyAdapter = DataAdapters.history;
        testCollectionData = testDataGenerator(1, 1440000000, 5);
        asyncStorage.mItems['foo' + HISTORY_COLLECTION_MTIME] =
            testCollectionData[0].last_modified;
        historyAdapter.update(kintoCollection,
            { readonly: true, userid: 'foo' })
        .then(() => {
          assert.equal(asyncStorage.mItems['foo' + HISTORY_COLLECTION_MTIME],
              testCollectionData[0].last_modified);
          getPlacesStore().then(placesStore => {
            var ids = testCollectionData.map(item => {
              return item.payload.histUri;
            });
            placesStore.get.apply(placesStore, ids).then(list => {
              for (var i = 0; i < ids.length; i++) {
                verifyPlaces(testCollectionData[i], list[i]);
                assert.equal(
                  asyncStorage.mItems[
                      'foo' + HISTORY_SYNCTOID_PREFIX + list[i].fxsyncId],
                  list[i].url);
              }
              assert.equal(asyncStorage.mItems[
                  'foo' + HISTORY_LAST_REVISIONID], `latest-after-${task}`);
              done();
            });
          });
        });
      });
    });
  });

  test('update - does not refill the DataStore if nothing removed locally',
      function(done) {
    var historyAdapter = DataAdapters.history;
    testCollectionData = testDataGenerator(1, 1440000000, 5);
    asyncStorage.mItems['foo' + HISTORY_COLLECTION_MTIME] =
        testCollectionData[0].last_modified;
    historyAdapter.update(kintoCollection, { readonly: true, userid: 'foo' })
        .then(() => {
      assert.equal(asyncStorage.mItems['foo' + HISTORY_COLLECTION_MTIME],
          testCollectionData[0].last_modified);
      getPlacesStore().then(placesStore => {
        var ids = testCollectionData.map(item => {
          return item.payload.histUri;
        });
        placesStore.get.apply(placesStore, ids).then(list => {
          for (var i = 0; i < ids.length; i++) {
            assert.equal(list[i], null);
          }
          assert.equal(asyncStorage.mItems[
              'foo' + HISTORY_LAST_REVISIONID], 'latest-not-cleared');
          done();
        });
      });
    });
  });

  test('update - 1 sync request with 5 new records', function(done) {
    var historyAdapter = DataAdapters.history;
    var lazyLoaderSpy = this.sinon.spy(MockLazyLoader, 'load');

    testCollectionData = testDataGenerator(1, 1440000000, 5);
    historyAdapter.update(kintoCollection, { readonly: true, userid: 'foo' })
        .then((result) => {
      var mTime = testCollectionData[0].last_modified;
      assert.equal(lazyLoaderSpy.calledWith(['shared/js/async_storage.js']),
          true);
      assert.equal(result, false);
      assert.equal(asyncStorage.mItems['foo' + HISTORY_COLLECTION_MTIME],
                   mTime);
      return Promise.resolve();
    }).then(getPlacesStore).then(placesStore => {
      var ids = testCollectionData.map(item => {
        return item.payload.histUri;
      });
      return placesStore.get.apply(placesStore, ids).then(list => {
        for (var i = 0; i < ids.length; i++) {
          verifyPlaces(testCollectionData[i], list[i]);
          assert.equal(
            asyncStorage.mItems[
                'foo' + HISTORY_SYNCTOID_PREFIX + list[i].fxsyncId],
            list[i].url);
        }
      });
    }).then(done, reason => {
      assert.ok(false, reason);
    });
  });

  suite('if a DataStore race condition occurs', function() {
    setup(function() {
      MockDatastore._raceCondition = true;
    });
    teardown(function() {
      delete MockDatastore._raceCondition;
    });

    test('update - rejects its promise', function(done) {
      var historyAdapter = DataAdapters.history;
      var lazyLoaderSpy = this.sinon.spy(MockLazyLoader, 'load');

      testCollectionData = testDataGenerator(1, 1440000000, 5);
      historyAdapter.update(kintoCollection, { readonly: true, userid: 'foo' })
          .catch(error => {
        assert.equal(lazyLoaderSpy.calledWith(['shared/js/sync/errors.js']),
            true);
        assert.equal(error.message, ERROR_SYNC_APP_RACE_CONDITION);
        assert.equal(asyncStorage.mItems['foo' + HISTORY_COLLECTION_MTIME],
                     null);
        done();
      });
    });
  });

  test('update - 1 sync request with 5 pre-existing records', function(done) {
    var historyAdapter = DataAdapters.history;
    getPlacesStore().then(store => {
      for (var i=1; i<=5; i++) {
        store._records['http://example' + i + '.com/'] = {
          url: 'http://example' + i + '.com/',
          title: 'old',
          visits: []
        };
      }
    }).then(() => {
      testCollectionData = testDataGenerator(1, 1440000000, 5);
      return historyAdapter.update(kintoCollection,
          { readonly: true, userid: 'foo' });
    }).then((result) => {
      assert.equal(result, false);
      var mTime = testCollectionData[0].last_modified;
      assert.equal(asyncStorage.mItems['foo' + HISTORY_COLLECTION_MTIME],
                   mTime);
      return Promise.resolve();
    }).then(getPlacesStore).then(placesStore => {
      var ids = testCollectionData.map(item => {
        return item.payload.histUri;
      });
      return placesStore.get.apply(placesStore, ids).then(list => {
        for (var i = 0; i < ids.length; i++) {
          verifyPlaces(testCollectionData[i], list[i]);
          assert.equal(
            asyncStorage.mItems[
                'foo' + HISTORY_SYNCTOID_PREFIX + list[i].fxsyncId],
            list[i].url);
        }
      });
    }).then(done, reason => {
      assert.ok(false, reason);
    });
  });

  test('update - 2 sync requests', function(done) {
    var historyAdapter = DataAdapters.history;
    Promise.resolve().then(() => {
      testCollectionData = testDataGenerator(1, 100, 5)
        .concat(testCollectionData);
      return historyAdapter.update(kintoCollection,
          { readonly: true, userid: 'foo' });
    }).then((result) => {
      assert.equal(result, false);
      var mTime = testCollectionData[0].last_modified;
      assert.equal(asyncStorage.mItems['foo' + HISTORY_COLLECTION_MTIME],
                   mTime);
      return Promise.resolve();
    }).then(() => {
      testCollectionData = testDataGenerator(6, 500, 5)
        .concat(testCollectionData);
      return historyAdapter.update(kintoCollection,
          { readonly: true, userid: 'foo' });
    }).then((result) => {
      assert.equal(result, false);
      var mTime = testCollectionData[0].last_modified;
      assert.equal(asyncStorage.mItems['foo' + HISTORY_COLLECTION_MTIME],
                   mTime);
      return Promise.resolve();
    }).then(getPlacesStore).then(placesStore => {
      var ids = testCollectionData.map(item => {
        return item.payload.histUri;
      });
      return placesStore.get.apply(placesStore, ids).then(list => {
        for (var i = 0; i < ids.length; i++) {
          verifyPlaces(testCollectionData[i], list[i]);
          assert.equal(
            asyncStorage.mItems[
                'foo' + HISTORY_SYNCTOID_PREFIX + list[i].fxsyncId],
            list[i].url);
        }
      });
    }).then(done, reason => {
      assert.ok(false, reason);
    });
  });

  test('update - 2 sync requests with 2 deleted: true records', function(done) {
    var historyAdapter = DataAdapters.history, store;
    var deletedQueue = ['UNIQUE_ID_1', 'UNIQUE_ID_4'];
    Promise.resolve().then(() => {
      testCollectionData = testDataGenerator(1, 100, 5)
        .concat(testCollectionData);
      return historyAdapter.update(kintoCollection,
          { readonly: true, userid: 'foo' });
    }).then((result) => {
      assert.equal(result, false);
      var mTime = testCollectionData[0].last_modified;
      assert.equal(asyncStorage.mItems['foo' + HISTORY_COLLECTION_MTIME],
          mTime);
      return Promise.resolve();
    }).then(() => {
      testCollectionData = testDataGenerator(6, 500, 5)
        .concat(testCollectionData);
      var latestModified = testCollectionData[0].last_modified + 10000;
      var deletedRecords = [];
      deletedQueue.forEach((synctoId, i) => {
        deletedRecords.push({
          id: synctoId,
          last_modified: latestModified + 10000 * i,
          payload: {
            deleted: true,
            id: synctoId
          }
        });
      });
      testCollectionData = deletedRecords.concat(testCollectionData);
      return historyAdapter.update(kintoCollection,
          { readonly: true, userid: 'foo' });
    }).then((result) => {
      assert.equal(result, false);
      var mTime = testCollectionData[0].last_modified;
      assert.equal(asyncStorage.mItems['foo' + HISTORY_COLLECTION_MTIME],
          mTime);
      assert.equal(asyncStorage.mItems['foo' + HISTORY_LAST_REVISIONID],
          'latest-not-cleared');
      return Promise.resolve();
    }).then(getPlacesStore).then(placesStore => {
      store = placesStore;
      var ids = testCollectionData.map(item => {
        return item.payload.histUri;
      });
      return store.get.apply(store, ids).then(list => {
        for (var i = 0; i < list.length; i++) {
          if (list[i]) {
            verifyPlaces(testCollectionData[i], list[i]);
            assert.equal(
              asyncStorage.mItems[
                  'foo' + HISTORY_SYNCTOID_PREFIX + list[i].fxsyncId],
              list[i].url);
          } else {
            assert.notEqual(deletedQueue.indexOf(testCollectionData[i].id), -1);
          }
        }
      });
    }).then(done, reason => {
      assert.ok(false, reason);
    });
  });

  test('update - non-array visits record', function(done) {
    var historyAdapter = DataAdapters.history;
    var i = 1;
    testCollectionData.unshift({
      id: 'UNIQUE_ID_' + i,
      last_modified: 100 + i * 10,
      payload: {
        id: 'UNIQUE_ID_' + i,
        histUri: 'http://example' + i + '.com/',
        title: 'Example ' + i + ' Title',
        visits: null
      }
    });
    historyAdapter.update(kintoCollection,
        { readonly: true, userid: 'foo' }).then((result) => {
      assert.equal(result, false);
      assert.equal(asyncStorage.mItems['foo' + HISTORY_COLLECTION_MTIME], 110);
      assert.equal(asyncStorage.mItems['foo' + HISTORY_LAST_REVISIONID],
          'latest-not-cleared');
      return Promise.resolve();
    }).then(done, reason => {
      assert.ok(false, reason);
    });
  });

  test('update - empty visits array record (not created locally)',
      function(done) {
    var historyAdapter = DataAdapters.history;
    var i = 1;
    testCollectionData.unshift({
      id: 'UNIQUE_ID_' + i,
      last_modified: 100 + i * 10,
      payload: {
        id: 'UNIQUE_ID_' + i,
        histUri: 'http://example' + i + '.com/',
        title: 'Example ' + i + ' Title',
        visits: []
      }
    });
    MockDatastore._records = {
      'http://example1.com/': {}
    };
    historyAdapter.update(kintoCollection,
        { readonly: true, userid: 'foo' }).then((result) => {
      assert.equal(result, false);
      assert.equal(asyncStorage.mItems['foo' + HISTORY_COLLECTION_MTIME], 110);
      assert.equal(dataStoreRemoveSpy.callCount, 1);
      assert.equal(dataStoreRemoveSpy.args[0][0], 'http://example1.com/');
      return Promise.resolve();
    }).then(done, reason => {
      assert.ok(false, reason);
    });
  });

  test('update - empty visits array record (created locally)', function(done) {
    var historyAdapter = DataAdapters.history;
    var i = 1;
    testCollectionData.unshift({
      id: 'UNIQUE_ID_' + i,
      last_modified: 100 + i * 10,
      payload: {
        id: 'UNIQUE_ID_' + i,
        histUri: 'http://example' + i + '.com/',
        title: 'Example ' + i + ' Title',
        visits: []
      }
    });
    MockDatastore._records = {
      'http://example1.com/': {
        createdLocally: true
      }
    };
    historyAdapter.update(kintoCollection,
        { readonly: true, userid: 'foo' }).then((result) => {
      assert.equal(result, false);
      assert.equal(asyncStorage.mItems['foo' + HISTORY_COLLECTION_MTIME], 110);
      assert.equal(dataStoreRemoveSpy.callCount, 0);
      return Promise.resolve();
    }).then(done, reason => {
      assert.ok(false, reason);
    });
  });

  test('update - empty history-uri record', function(done) {
    var historyAdapter = DataAdapters.history;
    var i = 1;
    testCollectionData.unshift({
      id: 'UNIQUE_ID_' + i,
      last_modified: 100 + i * 10,
      payload: {
        id: 'UNIQUE_ID_' + i,
        histUri: '',
        title: 'Example ' + i + ' Title',
        visits: [10000, 20000]
      }
    });
    historyAdapter.update(kintoCollection,
        { readonly: true, userid: 'foo' }).then((result) => {
      assert.equal(result, false);
      assert.equal(asyncStorage.mItems['foo' + HISTORY_COLLECTION_MTIME], 110);
      assert.equal(asyncStorage.mItems['foo' + HISTORY_LAST_REVISIONID],
          'latest-not-cleared');
      return Promise.resolve();
    }).then(done, reason => {
      assert.ok(false, reason);
    });
  });

  test('update - empty last_modified record', function(done) {
    var historyAdapter = DataAdapters.history;
    var i = 1;
    testCollectionData.unshift({
      id: 'UNIQUE_ID_' + i,
      last_modified: null,
      payload: {
        id: 'UNIQUE_ID_' + i,
        histUri: 'http://example' + i + '.com/',
        title: 'Example ' + i + ' Title',
        visits: [10000, 20000]
      }
    });
    historyAdapter.update(kintoCollection,
        { readonly: true, userid: 'foo' }).then((result) => {
      assert.equal(result, false);
      assert.equal(asyncStorage.mItems['foo' + HISTORY_COLLECTION_MTIME], null);
      assert.equal(asyncStorage.mItems['foo' + HISTORY_LAST_REVISIONID],
          'latest-not-cleared');
      return Promise.resolve();
    }).then(done, reason => {
      assert.ok(false, reason);
    });
  });

  test('HistoryHelper - merge two remote records', function(done) {
    var place1 = {
      url: 'http://www.mozilla.org/en-US/',
      title: '',
      fxsyncId: '',
      createdLocally: false,
      visits: [ 1501000000000, 1502000000000 ]
    };

    var place2 = {
      url: 'http://www.mozilla.org/en-US/',
      title: 'Mozilla',
      fxsyncId: 'XXXXX_ID_XXXXX',
      visits: [ 1502000000000, 1503000000000 ]
    };

    var result = HistoryHelper.mergeRecordsToDataStore(place1, place2);
    var expectedPlace = {
      url: 'http://www.mozilla.org/en-US/',
      title: 'Mozilla',
      fxsyncId: 'XXXXX_ID_XXXXX',
      createdLocally: false,
      visits: [1503000000000, 1502000000000, 1501000000000]
    };

    assert.equal(result.title, expectedPlace.title);
    assert.equal(result.url, expectedPlace.url);
    assert.equal(result.visits.length, expectedPlace.visits.length);
    for(var i = 0; i < result.visits.length; i++){
      assert.equal(result.visits[i], expectedPlace.visits[i]);
    }
    done();
  });

  test('HistoryHelper - merge remote record into local record', function(done) {
    var place1 = {
      url: 'http://www.mozilla.org/en-US/',
      title: '',
      fxsyncId: '',
      visits: [ 1501000000000, 1502000000000 ]
    };

    var place2 = {
      url: 'http://www.mozilla.org/en-US/',
      title: 'Mozilla',
      fxsyncId: 'XXXXX_ID_XXXXX',
      visits: [ 1502000000000, 1503000000000 ]
    };

    var result = HistoryHelper.mergeRecordsToDataStore(place1, place2);
    var expectedPlace = {
      url: 'http://www.mozilla.org/en-US/',
      title: 'Mozilla',
      fxsyncId: 'XXXXX_ID_XXXXX',
      createdLocally: true,
      visits: [1503000000000, 1502000000000, 1501000000000]
    };

    assert.equal(result.title, expectedPlace.title);
    assert.equal(result.url, expectedPlace.url);
    assert.equal(result.visits.length, expectedPlace.visits.length);
    for(var i = 0; i < result.visits.length; i++){
      assert.equal(result.visits[i], expectedPlace.visits[i]);
    }
    done();
  });

  test('HistoryHelper - merge two records with incorrect URL', function(done) {
    var place1 = {
      url: 'dummy',
      title: '',
      fxsyncId: '',
      visits: [ 1501000000000, 1502000000000 ]
    };

    var place2 = {
      url: 'http://www.mozilla.org/en-US/',
      title: 'Mozilla',
      fxsyncId: 'XXXXX_ID_XXXXX',
      visits: [ 1502000000000, 1503000000000 ]
    };

    assert.throws(() => {
      HistoryHelper.mergeRecordsToDataStore(place1, place2);
    });
    done();
  });

  test('HistoryHelper - merge two records with incorrect fxsyncId',
      function(done) {
    var place1 = {
      url: 'http://www.mozilla.org/en-US/',
      title: '',
      fxsyncId: 'dummy',
      visits: [ 1501000000000, 1502000000000 ]
    };

    var place2 = {
      url: 'http://www.mozilla.org/en-US/',
      title: 'Mozilla',
      fxsyncId: 'XXXXX_ID_XXXXX',
      visits: [ 1502000000000, 1503000000000 ]
    };

    assert.throws(() => {
      HistoryHelper.mergeRecordsToDataStore(place1, place2);
    });
    done();
  });
});
