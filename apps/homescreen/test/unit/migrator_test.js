'use strict';

/* global MockNavigatormozSetMessageHandler, CollectionsDatabase, migrator,
          BookmarksDatabase, HomeState, GridItemsFactory, MockasyncStorage,
          verticalPreferences */

require('/shared/js/bookmarks_database.js');
require('/shared/js/collections_database.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/js/homescreens/vertical_preferences.js');

requireApp('homescreen/test/unit/mock_asyncStorage.js');
requireApp('homescreen/js/grid_components.js');
requireApp('homescreen/js/bookmark.js');
requireApp('homescreen/js/state.js');

mocha.globals(['asyncStorage']);

suite('migrator.js >', function() {

  var realSetMessageHandler = null,
      realAsyncStorage = null,
      eventName = 'connection',
      url = 'http://www.test.com/',
      bdAddStub = null,
      cdAddStub = null,
      vpPutStub = null,
      vpGetStub = null,
      bookmarks = [],
      collections = [],
      layout = null,
      port = {
        start: function() {
          this.cb();
        },

        set onmessage(cb) {
          this.cb = cb;
        }
      };

  suiteSetup(function(done) {
    realAsyncStorage = window.asyncStorage;
    window.asyncStorage = MockasyncStorage;
    realSetMessageHandler = navigator.mozSetMessageHandler;
    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mSetup();
    requireApp('homescreen/js/migrator.js', done);
    vpGetStub = sinon.stub(verticalPreferences, 'get', function(id) {
      return {
        then: function(resolve) {
          resolve();
        }
      };
    });
  });

  suiteTeardown(function() {
    window.asyncStorage = realAsyncStorage;
    MockNavigatormozSetMessageHandler.mTeardown();
    navigator.mozSetMessageHandler = realSetMessageHandler;
    vpGetStub.restore();
  });

  setup(function() {
    bdAddStub = sinon.stub(BookmarksDatabase, 'add', function(bookmark) {
      bookmarks.push(bookmark);

      return {
        then: function(resolve) {
          resolve();
        }
      };
    });

    cdAddStub = sinon.stub(CollectionsDatabase, 'add', function(collection) {
      collections.push(collection);

      return {
        then: function(resolve) {
          resolve();
        }
      };
    });

    vpPutStub = sinon.stub(verticalPreferences, 'put', function(id, data) {
      layout = data;

      return {
        then: function(resolve) {
          resolve();
        }
      };
    });
  });

  teardown(function() {
    delete port.postMessage;
    bdAddStub.restore();
    cdAddStub.restore();
    vpPutStub.restore();
    bookmarks = [];
    collections = [];
  });

  function startMigration() {
    MockNavigatormozSetMessageHandler.mTrigger(eventName, {
      keyword: 'migrate',
      port: port
    });
  }

  function createIcon(name, params) {
    var icon = {
      id: 'id' + name,
      name: name,
      url: url + name,
      icon: '/icons/' + name + '.png'
    };

    params = params || {};
    Object.keys(params).forEach(function(paramName) {
      icon[paramName] = params[paramName];
    });

    return icon;
  }

  test('The library was initialized correctly ', function() {
    assert.isUndefined(migrator.iterating);
    assert.isUndefined(migrator.migrating);
  });

  test('Error while reading indexedDB ', function(done) {
    port.postMessage = function(msg) {
      assert.equal(msg, 'Failed');
      done();
    };

    var stub = sinon.stub(HomeState, 'getGrid', function(iterator, success,
                                                         error) {
      stub.restore();
      error();
    });

    startMigration();
  });

  test('Empty indexedDB ', function(done) {
    port.postMessage = function(msg) {
      assert.equal(msg, 'Done');
      done();
    };

    var stub = sinon.stub(HomeState, 'getGrid', function(iterator, success) {
      stub.restore();
      success();
    });

    startMigration();
  });

  test('Migrating a bookmark from pre-1.3 to 2.0', function(done) {
    var page = {
      'index': 0,
      'icons': [ createIcon('bookmark', {
                   bookmarkURL: 'http://xxxx.com'
                 }),
                 createIcon('app')
               ]
    };

    port.postMessage = function(msg) {
      assert.equal(msg, 'Done');

      assert.isTrue(bdAddStub.called);
      assert.equal(bookmarks.length, 1);

      assert.isFalse(cdAddStub.called);
      assert.equal(collections.length, 0);

      assert.isTrue(vpPutStub.called);
      var firstPage = layout.grid[0];
      assert.equal(firstPage.length, 2);
      assert.equal(firstPage[0].id, url + 'bookmark');
      assert.equal(firstPage[1].name, 'app');
      done();
    };

    var stub = sinon.stub(HomeState, 'getGrid', function(iterator, success) {
      stub.restore();
      iterator(page);
      success();
    });

    startMigration();
  });

  test('Migrating a bookmark from 1.4 or 1.5 to 2.0', function(done) {
    var page = {
      'index': 0,
      'icons': [ createIcon('bookmark', {
                   type: GridItemsFactory.TYPE.BOOKMARK
                 }),
                 createIcon('app')
               ]
    };

    port.postMessage = function(msg) {
      assert.equal(msg, 'Done');

      assert.isTrue(bdAddStub.called);
      assert.equal(bookmarks.length, 1);

      assert.isFalse(cdAddStub.called);
      assert.equal(collections.length, 0);

      assert.isTrue(vpPutStub.called);
      var firstPage = layout.grid[0];
      assert.equal(firstPage.length, 2);
      assert.equal(firstPage[0].id, url + 'bookmark');
      assert.equal(firstPage[0].role, GridItemsFactory.TYPE.BOOKMARK);
      assert.equal(firstPage[1].name, 'app');
      done();
    };

    var stub = sinon.stub(HomeState, 'getGrid', function(iterator, success) {
      stub.restore();
      iterator(page);
      success();
    });

    startMigration();
  });

  test('Migrating two bookmarks in same page ', function(done) {
    var page = {
      'index': 0,
      'icons': [ createIcon('bookmark', {
                   type: GridItemsFactory.TYPE.BOOKMARK
                 }),
                 createIcon('app'),
                 createIcon('bookmark2', {
                   type: GridItemsFactory.TYPE.BOOKMARK
                 })
               ]
    };

    port.postMessage = function(msg) {
      assert.equal(msg, 'Done');

      assert.isTrue(bdAddStub.called);
      assert.equal(bookmarks.length, 2);

      assert.isFalse(cdAddStub.called);
      assert.equal(collections.length, 0);

      assert.isTrue(vpPutStub.called);
      var firstPage = layout.grid[0];
      assert.equal(firstPage.length, 3);
      assert.equal(firstPage[0].id, url + 'bookmark');
      assert.equal(firstPage[0].role, GridItemsFactory.TYPE.BOOKMARK);
      assert.equal(firstPage[1].name, 'app');
      assert.equal(firstPage[2].id, url + 'bookmark2');
      assert.equal(firstPage[2].role, GridItemsFactory.TYPE.BOOKMARK);
      done();
    };

    var stub = sinon.stub(HomeState, 'getGrid', function(iterator, success) {
      stub.restore();
      iterator(page);
      success();
    });

    startMigration();
  });

  test('Migrating two bookmarks in different pages ', function(done) {
    var page0 = {
      'index': 0,
      'icons': [ createIcon('bookmark', {
                   type: GridItemsFactory.TYPE.BOOKMARK
                 })]
    };

    var page1 = {
      'index': 1,
      'icons': [ createIcon('bookmark2', {
                   type: GridItemsFactory.TYPE.BOOKMARK
                 })]
    };

    port.postMessage = function(msg) {
      assert.equal(msg, 'Done');

      assert.isTrue(bdAddStub.called);
      assert.equal(bookmarks.length, 2);

      assert.isFalse(cdAddStub.called);
      assert.equal(collections.length, 0);

      assert.isTrue(vpPutStub.called);
      var firstPage = layout.grid[0];
      assert.equal(firstPage.length, 1);
      assert.equal(firstPage[0].id, url + 'bookmark');
      assert.equal(firstPage[0].role, GridItemsFactory.TYPE.BOOKMARK);

      var secondPage = layout.grid[1];
      assert.equal(secondPage.length, 1);
      assert.equal(secondPage[0].id, url + 'bookmark2');
      assert.equal(secondPage[0].role, GridItemsFactory.TYPE.BOOKMARK);
      done();
    };

    var stub = sinon.stub(HomeState, 'getGrid', function(iterator, success) {
      stub.restore();
      iterator(page0);
      iterator(page1);
      success();
    });

    startMigration();
  });

  test('Migrating a collection', function(done) {
    var page = {
      'index': 0,
      'icons': [ createIcon('collection', {
                   type: GridItemsFactory.TYPE.COLLECTION,
                   provider_id: 234
                 }),
                 createIcon('app')
               ]
    };

    port.postMessage = function(msg) {
      assert.equal(msg, 'Done');
      
      assert.isFalse(bdAddStub.called);
      assert.equal(bookmarks.length, 0);

      assert.isTrue(cdAddStub.called);
      assert.equal(collections.length, 1);

      assert.isTrue(vpPutStub.called);
      var firstPage = layout.grid[0];
      assert.equal(firstPage.length, 2);
      assert.equal(firstPage[0].id, 234);
      assert.equal(firstPage[0].role, GridItemsFactory.TYPE.COLLECTION);
      assert.equal(firstPage[1].name, 'app');
      done();
    };

    var stub = sinon.stub(HomeState, 'getGrid', function(iterator, success) {
      stub.restore();
      iterator(page);
      success();
    });

    startMigration();
  });

  test('Migrating two collections in the same page', function(done) {
    var page = {
      'index': 0,
      'icons': [ createIcon('collection', {
                   type: GridItemsFactory.TYPE.COLLECTION,
                   provider_id: 234
                 }),
                 createIcon('collection2', {
                   type: GridItemsFactory.TYPE.COLLECTION,
                   provider_id: 129
                 }),
                 createIcon('app')
               ]
    };

    port.postMessage = function(msg) {
      assert.equal(msg, 'Done');
      
      assert.isFalse(bdAddStub.called);
      assert.equal(bookmarks.length, 0);

      assert.isTrue(cdAddStub.called);
      assert.equal(collections.length, 2);

      assert.isTrue(vpPutStub.called);
      var firstPage = layout.grid[0];
      assert.equal(firstPage.length, 3);
      assert.equal(firstPage[0].id, 234);
      assert.equal(firstPage[0].role, GridItemsFactory.TYPE.COLLECTION);
      assert.equal(firstPage[1].id, 129);
      assert.equal(firstPage[1].role, GridItemsFactory.TYPE.COLLECTION);
      assert.equal(firstPage[2].name, 'app');
      done();
    };

    var stub = sinon.stub(HomeState, 'getGrid', function(iterator, success) {
      stub.restore();
      iterator(page);
      success();
    });

    startMigration();
  });

  test('Migrating two collections in different pages ', function(done) {
    var page0 = {
      'index': 0,
      'icons': [ createIcon('collection', {
                   type: GridItemsFactory.TYPE.COLLECTION,
                   provider_id: 234
                 })]
    };

    var page1 = {
      'index': 1,
      'icons': [ createIcon('collection2', {
                   type: GridItemsFactory.TYPE.COLLECTION,
                   provider_id: 129
                 })]
    };

    port.postMessage = function(msg) {
      assert.equal(msg, 'Done');

      assert.isFalse(bdAddStub.called);
      assert.equal(bookmarks.length, 0);

      assert.isTrue(cdAddStub.called);
      assert.equal(collections.length, 2);

      assert.isTrue(vpPutStub.called);
      var firstPage = layout.grid[0];
      assert.equal(firstPage.length, 1);
      assert.equal(firstPage[0].id, 234);
      assert.equal(firstPage[0].role, GridItemsFactory.TYPE.COLLECTION);
      
      var secondPage = layout.grid[1];
      assert.equal(secondPage.length, 1);
      assert.equal(secondPage[0].id, 129);
      assert.equal(secondPage[0].role, GridItemsFactory.TYPE.COLLECTION);
      done();
    };

    var stub = sinon.stub(HomeState, 'getGrid', function(iterator, success) {
      stub.restore();
      iterator(page0);
      iterator(page1);
      success();
    });

    startMigration();
  });

  test('Migrating bookmarks and collections ', function(done) {
    var page0 = {
      'index': 0,
      'icons': [ createIcon('bookmark', {
                   type: GridItemsFactory.TYPE.BOOKMARK
                 }),
                 createIcon('app'),
                 createIcon('app'),
                 createIcon('collection2', {
                   type: GridItemsFactory.TYPE.COLLECTION,
                   provider_id: 234
                 })]
    };

    var page1 = {
      'index': 1,
      'icons': [ createIcon('collection', {
                   type: GridItemsFactory.TYPE.COLLECTION,
                   provider_id: 129
                 }),
                 createIcon('app'),
                 createIcon('bookmark2', {
                   type: GridItemsFactory.TYPE.BOOKMARK
                 })]
    };

    port.postMessage = function(msg) {
      assert.equal(msg, 'Done');

      assert.isTrue(bdAddStub.called);
      assert.equal(bookmarks.length, 2);

      assert.isTrue(cdAddStub.called);
      assert.equal(collections.length, 2);

      assert.isTrue(vpPutStub.called);
      var firstPage = layout.grid[0];
      assert.equal(firstPage.length, 4);
      assert.equal(firstPage[0].id, url + 'bookmark');
      assert.equal(firstPage[0].role, GridItemsFactory.TYPE.BOOKMARK);
      assert.equal(firstPage[1].name, 'app');
      assert.equal(firstPage[2].name, 'app');
      assert.equal(firstPage[3].id, 234);
      assert.equal(firstPage[3].role, GridItemsFactory.TYPE.COLLECTION);

      var secondPage = layout.grid[1];
      assert.equal(secondPage.length, 3);
      assert.equal(secondPage[0].id, 129);
      assert.equal(secondPage[0].role, GridItemsFactory.TYPE.COLLECTION);
      assert.equal(secondPage[1].name, 'app');
      assert.equal(secondPage[2].id, url + 'bookmark2');
      assert.equal(secondPage[2].role, GridItemsFactory.TYPE.BOOKMARK);
      done();
    };

    var stub = sinon.stub(HomeState, 'getGrid', function(iterator, success) {
      stub.restore();
      iterator(page0);
      iterator(page1);
      success();
    });

    startMigration();
  });

});
