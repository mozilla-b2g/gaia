/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

/* global
  asyncStorage,
  DataAdapters,
  ERROR_SYNC_APP_RACE_CONDITION,
  TABS_COLLECTION_MTIME,
  TABS_LAST_REVISIONID,
  TabsHelper,
  MockasyncStorage,
  MockDatastore,
  MockLazyLoader,
  MockNavigatorDatastore
*/

require('/shared/js/sync/errors.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/apps/system/test/unit/mock_asyncStorage.js');
requireApp('sync/js/adapters/tabs.js');

window.DataAdapters = {};

suite('sync/adapters/tabs >', function() {
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

  function verifyTabs(remoteItem, localItem) {
    assert.deepEqual(remoteItem.payload, localItem);
    assert.isNumber(localItem.timestamp);
    assert.equal(remoteItem.last_modified, localItem.timestamp);
  }

  function testDataGenerator(initIndex, initDate, count) {
    var list = [];
    for (var i = initIndex; i < initIndex + count; i++) {
      var tabs = [];
      var startData = initDate + i * 100;
      for (var j = 0; j < 3; j++) {
        // Visits from FxSync will be in anti-chronological order
        tabs.unshift({
          title: 'Example ' + i + ' Title' + (startData + j * 10),
          urlHistory: [ 'http://example' + i + '.com/' + (startData + j * 10)],
          lastUsed: (startData + j * 10) * 1000,
          icon: ''
        });
      }

      list.unshift({
        id: 'UNIQUE_ID_' + i,
        last_modified: initDate + i * 10,
        payload: {
          id: 'UNIQUE_ID_' + i,
          clientName: 'Example ' + i + ' client name',
          tabs: tabs
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
    var tabsAdapter = DataAdapters.tabs;
    tabsAdapter.update(kintoCollection, { readonly: true, userid: 'foo' })
        .then((result) => {
      assert.equal(result, false);
      assert.equal(asyncStorage.mItems['foo' + TABS_LAST_REVISIONID],
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
        var tabsAdapter = DataAdapters.tabs;
        testCollectionData = testDataGenerator(1, 1440000000, 5);
        asyncStorage.mItems['foo' + TABS_COLLECTION_MTIME] =
            testCollectionData[0].last_modified;
        tabsAdapter.update(kintoCollection,
            { readonly: true, userid: 'foo' })
        .then(() => {
          assert.equal(asyncStorage.mItems['foo' + TABS_COLLECTION_MTIME],
              testCollectionData[0].last_modified);
          getPlacesStore().then(store => {
            var ids = testCollectionData.map(item => {
              return item.payload.id;
            });
            store.get.apply(store, ids).then(list => {
              for (var i = 0; i < ids.length; i++) {
                verifyTabs(testCollectionData[i], list[i]);
              }
              assert.equal(asyncStorage.mItems[
                  'foo' + TABS_LAST_REVISIONID], `latest-after-${task}`);
              done();
            });
          });
        });
      });
    });
  });

  test('update - does not refill the DataStore if nothing removed locally',
      function(done) {
    var tabsAdapter = DataAdapters.tabs;
    testCollectionData = testDataGenerator(1, 1440000000, 5);
    asyncStorage.mItems['foo' + TABS_COLLECTION_MTIME] =
        testCollectionData[0].last_modified;
    tabsAdapter.update(kintoCollection, { readonly: true, userid: 'foo' })
        .then(() => {
      assert.equal(asyncStorage.mItems['foo' + TABS_COLLECTION_MTIME],
          testCollectionData[0].last_modified);
      getPlacesStore().then(store => {
        var ids = testCollectionData.map(item => {
          return item.payload.id;
        });
        store.get.apply(store, ids).then(list => {
          for (var i = 0; i < ids.length; i++) {
            assert.equal(list[i], null);
          }
          assert.equal(asyncStorage.mItems[
              'foo' + TABS_LAST_REVISIONID], 'latest-not-cleared');
          done();
        });
      });
    });
  });

  test('update - 1 sync request with 5 new records', function(done) {
    var tabsAdapter = DataAdapters.tabs;
    var lazyLoaderSpy = this.sinon.spy(MockLazyLoader, 'load');

    testCollectionData = testDataGenerator(1, 1440000000, 5);
    tabsAdapter.update(kintoCollection, { readonly: true, userid: 'foo' })
        .then((result) => {
      var mTime = testCollectionData[0].last_modified;
      assert.equal(lazyLoaderSpy.calledWith(['shared/js/async_storage.js']),
          true);
      assert.equal(result, false);
      assert.equal(asyncStorage.mItems['foo' + TABS_COLLECTION_MTIME],
                   mTime);
      return Promise.resolve();
    }).then(getPlacesStore).then(store => {
      var ids = testCollectionData.map(item => {
        return item.payload.id;
      });
      return store.get.apply(store, ids).then(list => {
        for (var i = 0; i < ids.length; i++) {
          verifyTabs(testCollectionData[i], list[i]);
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
      var tabsAdapter = DataAdapters.tabs;
      var lazyLoaderSpy = this.sinon.spy(MockLazyLoader, 'load');

      testCollectionData = testDataGenerator(1, 1440000000, 5);
      tabsAdapter.update(kintoCollection, { readonly: true, userid: 'foo' })
          .catch(error => {
        assert.equal(lazyLoaderSpy.calledWith(['shared/js/sync/errors.js']),
            true);
        assert.equal(error.message, ERROR_SYNC_APP_RACE_CONDITION);
        assert.equal(asyncStorage.mItems['foo' + TABS_COLLECTION_MTIME],
                     null);
        done();
      });
    });
  });

  test('update - 1 sync request with 5 pre-existing records', function(done) {
    var tabsAdapter = DataAdapters.tabs;
    getPlacesStore().then(store => {
      for (var i=1; i<=5; i++) {
        store._records['UNIQUE_ID_' + i] = {
          id: 'UNIQUE_ID_' + i,
          clientName: 'Example ' + i + ' client name',
          tabs: []
        };
      }
    }).then(() => {
      testCollectionData = testDataGenerator(1, 1440000000, 5);
      return tabsAdapter.update(kintoCollection,
          { readonly: true, userid: 'foo' });
    }).then((result) => {
      assert.equal(result, false);
      var mTime = testCollectionData[0].last_modified;
      assert.equal(asyncStorage.mItems['foo' + TABS_COLLECTION_MTIME],
                   mTime);
      return Promise.resolve();
    }).then(getPlacesStore).then(store => {
      var ids = testCollectionData.map(item => {
        return item.payload.id;
      });
      return store.get.apply(store, ids).then(list => {
        for (var i = 0; i < ids.length; i++) {
          verifyTabs(testCollectionData[i], list[i]);
        }
      });
    }).then(done, reason => {
      assert.ok(false, reason);
    });
  });

  test('update - 2 sync requests', function(done) {
    var tabsAdapter = DataAdapters.tabs;
    Promise.resolve().then(() => {
      testCollectionData = testDataGenerator(1, 100, 5)
        .concat(testCollectionData);
      return tabsAdapter.update(kintoCollection,
          { readonly: true, userid: 'foo' });
    }).then((result) => {
      assert.equal(result, false);
      var mTime = testCollectionData[0].last_modified;
      assert.equal(asyncStorage.mItems['foo' + TABS_COLLECTION_MTIME],
                   mTime);
      return Promise.resolve();
    }).then(() => {
      testCollectionData = testDataGenerator(6, 500, 5)
        .concat(testCollectionData);
      return tabsAdapter.update(kintoCollection,
          { readonly: true, userid: 'foo' });
    }).then((result) => {
      assert.equal(result, false);
      var mTime = testCollectionData[0].last_modified;
      assert.equal(asyncStorage.mItems['foo' + TABS_COLLECTION_MTIME],
                   mTime);
      return Promise.resolve();
    }).then(getPlacesStore).then(store => {
      var ids = testCollectionData.map(item => {
        return item.payload.id;
      });
      return store.get.apply(store, ids).then(list => {
        for (var i = 0; i < ids.length; i++) {
          verifyTabs(testCollectionData[i], list[i]);
        }
      });
    }).then(done, reason => {
      assert.ok(false, reason);
    });
  });

  test('update - non-array tabs record', function(done) {
    var tabsAdapter = DataAdapters.tabs;
    var i = 1;
    testCollectionData.unshift({
      id: 'UNIQUE_ID_' + i,
      last_modified: 100 + i * 10,
      payload: {
        id: 'UNIQUE_ID_' + i,
        clientName: 'Hello',
        createdLocally: false,
        tabs: null
      }
    });
    tabsAdapter.update(kintoCollection,
        { readonly: true, userid: 'foo' }).then((result) => {
      assert.equal(result, false);
      assert.equal(asyncStorage.mItems['foo' + TABS_COLLECTION_MTIME], 110);
      assert.equal(asyncStorage.mItems['foo' + TABS_LAST_REVISIONID],
          'latest-not-cleared');
      return Promise.resolve();
    }).then(done, reason => {
      assert.ok(false, reason);
    });
  });

  test('update - empty last_modified record', function(done) {
    var tabsAdapter = DataAdapters.tabs;
    var i = 1;
    testCollectionData.unshift({
      id: 'UNIQUE_ID_' + i,
      last_modified: null,
      payload: {
        id: 'UNIQUE_ID_' + i,
        clientName: 'Hello',
        createdLocally: false,
        tabs: []
      }
    });
    tabsAdapter.update(kintoCollection,
        { readonly: true, userid: 'foo' }).then((result) => {
      assert.equal(result, false);
      assert.equal(asyncStorage.mItems['foo' + TABS_COLLECTION_MTIME], null);
      assert.equal(asyncStorage.mItems['foo' + TABS_LAST_REVISIONID],
          'latest-not-cleared');
      return Promise.resolve();
    }).then(done, reason => {
      assert.ok(false, reason);
    });
  });

  test('TabsHelper - merge two remote records', function(done) {
    var place1 = {
      id: 'UNIQUE_ID_1',
      clientName: 'Hello',
      createdLocally: false,
      tabs: [{
       'title': 'GitHub · Where software is built',
       'urlHistory': ['https://github.com/'],
       'icon': '',
       'lastUsed': 1455612346
      }]
    };

    var place2 = {
      id: 'UNIQUE_ID_1',
      clientName: 'Hello',
      createdLocally: false,
      tabs: [{
        'title': 'GitHub · Where software is built',
        'urlHistory': ['https://github.com/'],
        'icon': '',
        'lastUsed': 1455612346
      },{
        'title': 'Mozilla',
        'urlHistory': ['https://www.mozilla.org/'],
        'icon': '',
        'lastUsed': 1455612303
      },{
        'title': 'Example',
        'urlHistory': ['https://www.example.org/'],
        'icon': '',
        'lastUsed': 1455612296
      }]
    };

    var result = TabsHelper.mergeRecordsToDataStore(place1, place2);
    var expectedPlace = {
      id: 'UNIQUE_ID_1',
      clientName: 'Hello',
      createdLocally: false,
      tabs: [{
        'title': 'GitHub · Where software is built',
        'urlHistory': ['https://github.com/'],
        'icon': '',
        'lastUsed': 1455612346
      },{
        'title': 'Mozilla',
        'urlHistory': ['https://www.mozilla.org/'],
        'icon': '',
        'lastUsed': 1455612303
      },{
        'title': 'Example',
        'urlHistory': ['https://www.example.org/'],
        'icon': '',
        'lastUsed': 1455612296
      }]
    };

    assert.deepEqual(expectedPlace, result);
    done();
  });

  test('TabsHelper - merge two records with incorrect clientName',
    function(done) {
    var place1 = {
      id: 'UNIQUE_ID_1',
      clientName: 'Hello',
      createdLocally: false,
      tabs: []
    };

    var place2 = {
      id: 'UNIQUE_ID_1',
      clientName: null,
      createdLocally: false,
      tabs: [{
        'title': 'GitHub · Where software is built',
        'urlHistory': ['https://github.com/'],
        'icon': '',
        'lastUsed': 1455612346
      }]
    };

    assert.throws(() => {
      TabsHelper.mergeRecordsToDataStore(place1, place2);
    });
    done();
  });

  test('TabsHelper - merge two records with incorrect id', function(done) {
    var place1 = {
      id: 'UNIQUE_ID_1',
      clientName: 'Hello',
      createdLocally: false,
      tabs: [{
        'title': 'GitHub · Where software is built',
        'urlHistory': ['https://github.com/'],
        'icon': '',
        'lastUsed': 1455612346
      }]
    };

    var place2 = {
      id: 'UNIQUE_ID_2',
      clientName: 'Hello',
      createdLocally: false,
      tabs: [{
        'title': 'GitHub · Where software is built',
        'urlHistory': ['https://github.com/'],
        'icon': '',
        'lastUsed': 1455612346
      }]
    };

    assert.throws(() => {
      TabsHelper.mergeRecordsToDataStore(place1, place2);
    });
    done();
  });
});
