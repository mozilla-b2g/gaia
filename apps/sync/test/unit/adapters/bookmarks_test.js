/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* global
  assert,
  asyncStorage,
  DataAdapters,
  BOOKMARKS_COLLECTION_MTIME,
  BOOKMARKS_SYNCTOID_PREFIX,
  BookmarksHelper,
  MockasyncStorage,
  MockDatastore,
  MockLazyLoader,
  MockNavigatorDatastore,
  require,
  requireApp,
  setup,
  sinon,
  suite,
  suiteSetup,
  suiteTeardown,
  teardown,
  test
*/

require('/apps/music/test/unit/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/apps/system/test/unit/mock_asyncStorage.js');
requireApp('sync/js/adapters/bookmarks.js');

window.DataAdapters = {};

suite('sync/adapters/bookmarks >', () => {
  var realDatastore, realLazyLoader, realAsyncStorage, testCollectionData;
  var updateBookmarksSpy;
  var kintoCollection = {
    list() {
      return Promise.resolve({
        data: testCollectionData
      });
    }
  };

  function getBookmarksStore() {
    return navigator.getDataStores().then(stores => {
      return Promise.resolve(stores[0]);
    });
  }

  function verifyBookmarks(collectionItem, bookmarksItem) {
    var payload = collectionItem.payload;
    switch (payload.type) {
    case 'bookmark':
      assert.equal(payload.bmkUri, bookmarksItem.id);
      assert.equal(payload.bmkUri, bookmarksItem.url);
      assert.equal(payload.title, bookmarksItem.name);
      assert.deepEqual(payload, bookmarksItem.fxsyncRecords[payload.id]);
      assert.equal('url', bookmarksItem.type);
      break;
    case 'query':
      assert.equal(payload.type + '|' + payload.id, bookmarksItem.id);
      assert.equal(payload.bmkUri, bookmarksItem.url);
      assert.equal(payload.title, bookmarksItem.name);
      assert.deepEqual(payload, bookmarksItem.fxsyncRecords[payload.id]);
      assert.equal('others', bookmarksItem.type);
      break;
    case 'folder':
      assert.equal(payload.type + '|' + payload.id, bookmarksItem.id);
      assert.equal(payload.title, bookmarksItem.name);
      assert.deepEqual(payload, bookmarksItem.fxsyncRecords[payload.id]);
      assert.equal('others', bookmarksItem.type);
      break;
    case 'livemark':
      assert.equal(payload.type + '|' + payload.id, bookmarksItem.id);
      assert.equal(payload.title, bookmarksItem.name);
      assert.deepEqual(payload, bookmarksItem.fxsyncRecords[payload.id]);
      assert.equal('others', bookmarksItem.type);
      break;
    case 'separator':
      assert.equal(payload.type + '|' + payload.id, bookmarksItem.id);
      assert.deepEqual(payload, bookmarksItem.fxsyncRecords[payload.id]);
      assert.equal('others', bookmarksItem.type);
      break;
    case 'microsummary':
      console.warn('microsummary is OBSOLETED ', payload);
      break;
    default:
      assert.ok(false, 'Unknown type');
    }

    assert.equal(payload.id, bookmarksItem.fxsyncId);
  }

  function testDataGenerator(initIndex, initDate, count) {
    var list = [];
    for (var i = initIndex; i < initIndex + count; i++) {
      var visits = [];
      var startData = initDate + i * 100;
      for (var j = 0; j < 3; j++) {
        visits.push({
          date: (startData + j * 10) * 1000, type: 3
        });
      }

      list.unshift({
        id: 'UNIQUE_ID_' + i,
        last_modified: initDate + i * 10,
        payload: {
          id: 'UNIQUE_ID_' + i,
          bmkUri: 'http://example' + i + '.com/',
          title: 'Example ' + i + ' Title',
          type: 'bookmark'
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
    updateBookmarksSpy = sinon.spy(BookmarksHelper, 'updateBookmarks');
    testCollectionData = [];
  });

  teardown(() => {
    updateBookmarksSpy.restore();
    MockDatastore._inError = false;
    MockDatastore._records = Object.create(null);
    window.asyncStorage.mTeardown();
  });

  test('update - empty records', done => {
    var bookmarksAdapter = DataAdapters.bookmarks;
    bookmarksAdapter.update(kintoCollection, { readonly: true, userid: 'foo' })
        .then(result => {
      assert.equal(result, false);
      assert.equal(updateBookmarksSpy.callCount, 0);
      assert.equal(asyncStorage.mItems['foo' + BOOKMARKS_COLLECTION_MTIME],
          null);
    }).then(done, reason => {
      done(reason || new Error('Rejected by undefined reason.'));
    });
  });

  test('update - 1 sync request with 5 new records', done => {
    var bookmarksAdapter = DataAdapters.bookmarks;
    testCollectionData = testDataGenerator(1, 1440000000, 5);
    bookmarksAdapter.update(kintoCollection, { readonly: true, userid: 'foo' })
        .then(result => {
      assert.equal(result, false);
      var mTime = testCollectionData[0].last_modified;
      assert.equal(asyncStorage.mItems['foo' + BOOKMARKS_COLLECTION_MTIME],
          mTime);
      assert.equal(updateBookmarksSpy.callCount, 1);
      return Promise.resolve();
    }).then(getBookmarksStore).then(bookmarksStore => {
      var ids = testCollectionData.map(item => {
        return item.payload.bmkUri;
      });
      return bookmarksStore.get.apply(bookmarksStore, ids).then(list => {
        for (var i = 0; i < ids.length; i++) {
          verifyBookmarks(testCollectionData[i], list[i]);
          assert.equal(
            asyncStorage.mItems[
                'foo' + BOOKMARKS_SYNCTOID_PREFIX + list[i].fxsyncId],
            list[i].url);
        }
      });
    }).then(done, reason => {
      done(reason || new Error('Rejected by undefined reason.'));
    });
  });

  test('update - 2 sync requests', done => {
    var bookmarksAdapter = DataAdapters.bookmarks;
    Promise.resolve().then(() => {
      testCollectionData = testDataGenerator(1, 100, 5)
        .concat(testCollectionData);
      return bookmarksAdapter.update(kintoCollection,
          { readonly: true, userid: 'foo' });
    }).then(result => {
      assert.equal(result, false);
      var mTime = testCollectionData[0].last_modified;
      assert.equal(asyncStorage.mItems['foo' + BOOKMARKS_COLLECTION_MTIME],
          mTime);
      assert.equal(updateBookmarksSpy.callCount, 1);
      return Promise.resolve();
    }).then(() => {
      testCollectionData = testDataGenerator(6, 500, 5)
        .concat(testCollectionData);
      return bookmarksAdapter.update(kintoCollection,
          { readonly: true, userid: 'foo' });
    }).then(result => {
      assert.equal(result, false);
      var mTime = testCollectionData[0].last_modified;
      assert.equal(asyncStorage.mItems['foo' + BOOKMARKS_COLLECTION_MTIME],
          mTime);
      assert.equal(updateBookmarksSpy.callCount, 2);
      return Promise.resolve();
    }).then(getBookmarksStore).then(bookmarksStore => {
      var ids = testCollectionData.map(item => {
        return item.payload.bmkUri;
      });
      return bookmarksStore.get.apply(bookmarksStore, ids).then(list => {
        for (var i = 0; i < ids.length; i++) {
          verifyBookmarks(testCollectionData[i], list[i]);
          assert.equal(
            asyncStorage.mItems[
                'foo' + BOOKMARKS_SYNCTOID_PREFIX + list[i].fxsyncId],
            list[i].url);
        }
      });
    }).then(done, reason => {
      done(reason || new Error('Rejected by undefined reason.'));
    });
  });

  test('update - 2 sync requests with 2 deleted: true records', done => {
    var bookmarksAdapter = DataAdapters.bookmarks, store;
    var deletedQueue = ['UNIQUE_ID_1', 'UNIQUE_ID_4'];
    Promise.resolve().then(() => {
      testCollectionData = testDataGenerator(1, 100, 5)
        .concat(testCollectionData);
      return bookmarksAdapter.update(kintoCollection,
          { readonly: true, userid: 'foo' });
    }).then(result => {
      assert.equal(result, false);
      var mTime = testCollectionData[0].last_modified;
      assert.equal(asyncStorage.mItems['foo' + BOOKMARKS_COLLECTION_MTIME],
          mTime);
      assert.equal(updateBookmarksSpy.callCount, 1);
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
      return bookmarksAdapter.update(kintoCollection,
          { readonly: true, userid: 'foo' });
    }).then(result => {
      assert.equal(result, false);
      var mTime = testCollectionData[0].last_modified;
      assert.equal(asyncStorage.mItems['foo' + BOOKMARKS_COLLECTION_MTIME],
          mTime);
      assert.equal(updateBookmarksSpy.callCount, 2);
      return Promise.resolve();
    }).then(getBookmarksStore).then(bookmarksStore => {
      store = bookmarksStore;
      var ids = testCollectionData.map(item => {
        return item.payload.bmkUri;
      });
      return store.get.apply(store, ids).then(list => {
        for (var i = 0; i < list.length; i++) {
          if (list[i]) {
            verifyBookmarks(testCollectionData[i], list[i]);
            assert.equal(
              asyncStorage.mItems[
                  'foo' + BOOKMARKS_SYNCTOID_PREFIX + list[i].fxsyncId],
              list[i].url);
          } else {
            assert.notEqual(deletedQueue.indexOf(testCollectionData[i].id), -1);
          }
        }
      });
    }).then(done, reason => {
      done(reason || new Error('Rejected by undefined reason.'));
    });
  });

  test('update - Add three records with the same URL and delete one', done => {
    var bookmarksAdapter = DataAdapters.bookmarks, store;
    Promise.resolve().then(() => {
      for (var i = 1; i <= 3; i++) {
        testCollectionData.unshift({
          id: 'UNIQUE_ID_' + i,
          last_modified: 100 + i * 10,
          payload: {
            id: 'UNIQUE_ID_' + i,
            type: 'bookmark',
            bmkUri: 'http://example.com/',
            title: 'Example ' + i + ' Title'
          }
        });
      }
      return bookmarksAdapter.update(kintoCollection,
          { readonly: true, userid: 'foo' });
    }).then(result => {
      assert.equal(result, false);
      var mTime = testCollectionData[0].last_modified;
      assert.equal(asyncStorage.mItems['foo' + BOOKMARKS_COLLECTION_MTIME],
          mTime);
      assert.equal(updateBookmarksSpy.callCount, 1);
      return Promise.resolve();
    }).then(() => {
      testCollectionData = [
        {
          id: 'UNIQUE_ID_2',
          last_modified: testCollectionData[0].last_modified + 10000,
          payload: {
            deleted: true,
            id: 'UNIQUE_ID_2'
          }
        },
        {
          id: 'UNIQUE_ID_3',
          last_modified: 130,
          payload: {
            id: 'UNIQUE_ID_3',
            type: 'bookmark',
            bmkUri: 'http://example.com/',
            title: 'Example 3 Title'
          }
        },
        {
          id: 'UNIQUE_ID_1',
          last_modified: 110,
          payload: {
            id: 'UNIQUE_ID_1',
            type: 'bookmark',
            bmkUri: 'http://example.com/',
            title: 'Example 1 Title'
          }
        }
      ];
      return bookmarksAdapter.update(kintoCollection,
          { readonly: true, userid: 'foo' });
    }).then(result => {
      assert.equal(result, false);
      var mTime = testCollectionData[0].last_modified;
      assert.equal(asyncStorage.mItems['foo' + BOOKMARKS_COLLECTION_MTIME],
          mTime);
      assert.equal(updateBookmarksSpy.callCount, 2);
      return Promise.resolve();
    }).then(getBookmarksStore).then(bookmarksStore => {
      store = bookmarksStore;
      return store.get.apply(store, ['http://example.com/']).then(item => {
        var expectedBookmark = {
          id: 'http://example.com/',
          url: 'http://example.com/',
          name: 'Example 1 Title',
          type: 'url',
          iconable: false,
          icon: '',
          syncNeeded: true,
          fxsyncRecords: {
            UNIQUE_ID_1: {
              id: 'UNIQUE_ID_1',
              type: 'bookmark',
              bmkUri: 'http://example.com/',
              title: 'Example 1 Title',
              timestamp: 110
            },
            UNIQUE_ID_2: {
              id: 'UNIQUE_ID_2',
              deleted: true
            },
            UNIQUE_ID_3: {
              id: 'UNIQUE_ID_3',
              type: 'bookmark',
              bmkUri: 'http://example.com/',
              title: 'Example 3 Title',
              timestamp: 130
            }
          },
          fxsyncId: 'UNIQUE_ID_3'
        };
        assert.equal(
          asyncStorage.mItems[
              'foo' + BOOKMARKS_SYNCTOID_PREFIX + item.fxsyncId],
          item.url);
        assert.deepEqual(item, expectedBookmark);
      });
    }).then(done, reason => {
      done(reason || new Error('Rejected by undefined reason.'));
    });
  });

  test('update - query, folder, livemark, and separator record', done => {
    var bookmarksAdapter = DataAdapters.bookmarks, store;
    var i = 1;
    testCollectionData.unshift({
      id: 'UNIQUE_ID_' + i,
      last_modified: 100 + i * 10,
      payload: {
        id: 'UNIQUE_ID_' + i,
        type: 'query',
        bmkUri: 'place:type=3&sort=4',
        title: 'Example ' + i + ' Title'
      }
    });
    i++;
    testCollectionData.unshift({
      id: 'UNIQUE_ID_' + i,
      last_modified: 100 + i * 10,
      payload: {
        id: 'UNIQUE_ID_' + i,
        type: 'folder',
        title: 'Example ' + i + ' Title'
      }
    });
    i++;
    testCollectionData.unshift({
      id: 'UNIQUE_ID_' + i,
      last_modified: 100 + i * 10,
      payload: {
        id: 'UNIQUE_ID_' + i,
        type: 'livemark',
        title: 'Example ' + i + ' Title'
      }
    });
    i++;
    testCollectionData.unshift({
      id: 'UNIQUE_ID_' + i,
      last_modified: 100 + i * 10,
      payload: {
        id: 'UNIQUE_ID_' + i,
        type: 'separator'
      }
    });
    bookmarksAdapter.update(kintoCollection, { readonly: true, userid: 'foo' })
        .then(result => {
      assert.equal(result, false);
      var mTime = testCollectionData[0].last_modified;
      assert.equal(asyncStorage.mItems['foo' + BOOKMARKS_COLLECTION_MTIME],
          mTime);
      assert.equal(updateBookmarksSpy.callCount, 1);
      return Promise.resolve();
    }).then(getBookmarksStore).then(bookmarksStore => {
      store = bookmarksStore;
      var ids = testCollectionData.map(item => {
        return item.payload.type + '|' + item.payload.id;
      });
      return store.get.apply(store, ids).then(list => {
        for (var i = 0; i < list.length; i++) {
          if (list[i]) {
            verifyBookmarks(testCollectionData[i], list[i]);
            assert.equal(
              asyncStorage.mItems[
                  'foo' + BOOKMARKS_SYNCTOID_PREFIX + list[i].fxsyncId],
              list[i].id);
          } else {
            assert.ok(false, 'Empty Record!');
          }
        }
      });
    }).then(done, reason => {
      done(reason || new Error('Rejected by undefined reason.'));
    });
  });

  test('update - empty bookmarks-uri record', done => {
    var bookmarksAdapter = DataAdapters.bookmarks;
    var i = 1;
    testCollectionData.unshift({
      id: 'UNIQUE_ID_' + i,
      last_modified: 100 + i * 10,
      payload: {
        id: 'UNIQUE_ID_' + i,
        type: 'bookmark',
        bmkUri: '',
        title: 'Example ' + i + ' Title'
      }
    });
    bookmarksAdapter.update(kintoCollection, { readonly: true, userid: 'foo' })
        .then(result => {
      assert.equal(result, false);
      assert.equal(asyncStorage.mItems['foo' + BOOKMARKS_COLLECTION_MTIME],
          null);
      assert.equal(updateBookmarksSpy.callCount, 0);
      return Promise.resolve();
    }).then(done, reason => {
      done(reason || new Error('Rejected by undefined reason.'));
    });
  });

  test('update - empty query-uri record', done => {
    var bookmarksAdapter = DataAdapters.bookmarks;
    var i = 1;
    testCollectionData.unshift({
      id: 'UNIQUE_ID_' + i,
      last_modified: 100 + i * 10,
      payload: {
        id: 'UNIQUE_ID_' + i,
        type: 'query',
        bmkUri: '',
        title: 'Example ' + i + ' Title'
      }
    });
    bookmarksAdapter.update(kintoCollection, { readonly: true, userid: 'foo' })
        .then(result => {
      assert.equal(result, false);
      assert.equal(asyncStorage.mItems['foo' + BOOKMARKS_COLLECTION_MTIME],
          null);
      assert.equal(updateBookmarksSpy.callCount, 0);
      return Promise.resolve();
    }).then(done, reason => {
      done(reason || new Error('Rejected by undefined reason.'));
    });
  });

  test('update - empty last_modified record', done => {
    var bookmarksAdapter = DataAdapters.bookmarks;
    var i = 1;
    testCollectionData.unshift({
      id: 'UNIQUE_ID_' + i,
      last_modified: null,
      payload: {
        id: 'UNIQUE_ID_' + i,
        type: 'bookmark',
        bmkUri: '',
        title: 'Example ' + i + ' Title'
      }
    });
    bookmarksAdapter.update(kintoCollection, { readonly: true, userid: 'foo' })
        .then(result => {
      assert.equal(result, false);
      assert.equal(asyncStorage.mItems['foo' + BOOKMARKS_COLLECTION_MTIME],
          null);
      assert.equal(updateBookmarksSpy.callCount, 0);
      return Promise.resolve();
    }).then(done, reason => {
      done(reason || new Error('Rejected by undefined reason.'));
    });
  });

  test('update - unknown type record', done => {
    var bookmarksAdapter = DataAdapters.bookmarks;
    var i = 1;
    testCollectionData.unshift({
      id: 'UNIQUE_ID_' + i,
      last_modified: 1000,
      payload: {
        id: 'UNIQUE_ID_' + i,
        type: 'unknown',
        bmkUri: null,
        title: 'Example ' + i + ' Title'
      }
    });
    bookmarksAdapter.update(kintoCollection, { readonly: true, userid: 'foo' })
        .then(result => {
      assert.equal(result, false);
      assert.equal(asyncStorage.mItems['foo' + BOOKMARKS_COLLECTION_MTIME],
          null);
      assert.equal(updateBookmarksSpy.callCount, 0);
      return Promise.resolve();
    }).then(done, reason => {
      done(reason || new Error('Rejected by undefined reason.'));
    });
  });

  test('BookmarksHelper - merge two records', done => {
    var bookmark1 = {
      url: 'http://www.mozilla.org/en-US/',
      name: '',
      type: 'url',
      fxsyncId: ''
    };

    var bookmark2 = {
      url: 'http://www.mozilla.org/en-US/',
      name: 'Mozilla',
      type: 'url',
      fxsyncRecords: {
        'XXXXX_ID_XXXXX': {}
      },
      fxsyncId: 'XXXXX_ID_XXXXX'
    };

    var result = BookmarksHelper.mergeRecordsToDataStore(bookmark1, bookmark2);
    var expectedBookmark = {
      url: 'http://www.mozilla.org/en-US/',
      name: 'Mozilla',
      type: 'url',
      fxsyncId: 'XXXXX_ID_XXXXX'
    };

    assert.equal(result.name, expectedBookmark.name);
    assert.equal(result.url, expectedBookmark.url);
    done();
  });

  test('BookmarksHelper - merge two records with incorrect URL', done => {
    var bookmark1 = {
      url: 'dummy',
      name: '',
      type: 'url',
      fxsyncId: ''
    };

    var bookmark2 = {
      url: 'http://www.mozilla.org/en-US/',
      name: 'Mozilla',
      type: 'url',
      fxsyncId: 'XXXXX_ID_XXXXX'
    };

    assert.throws(() => {
      BookmarksHelper.mergeRecordsToDataStore(bookmark1, bookmark2);
    });
    done();
  });

  test('BookmarksHelper - merge two records with incorrect fxsyncId', done => {
    var bookmark1 = {
      url: 'http://www.mozilla.org/en-US/',
      name: '',
      type: 'url',
      fxsyncRecords: {
        'XXXXX_ID_XXXXX_A': {
          id: 'XXXXX_ID_XXXXX_A'
        }
      },
      fxsyncId: 'XXXXX_ID_XXXXX_A'
    };

    var bookmark2 = {
      url: 'http://www.mozilla.org/en-US/',
      name: 'Mozilla',
      type: 'url',
      fxsyncRecords: {
        'XXXXX_ID_XXXXX_B': {
          id: 'XXXXX_ID_XXXXX_B'
        }
      },
      fxsyncId: 'XXXXX_ID_XXXXX_B'
    };

    var result = BookmarksHelper.mergeRecordsToDataStore(bookmark1, bookmark2);
    var expectedBookmark = {
      url: 'http://www.mozilla.org/en-US/',
      name: 'Mozilla',
      type: 'url',
      fxsyncRecords: {
        'XXXXX_ID_XXXXX_A': {
          id: 'XXXXX_ID_XXXXX_A'
        },
        'XXXXX_ID_XXXXX_B': {
          id: 'XXXXX_ID_XXXXX_B'
        }
      },
      fxsyncId: 'XXXXX_ID_XXXXX_A'
    };

    assert.equal(result.name, expectedBookmark.name);
    assert.equal(result.url, expectedBookmark.url);
    assert.deepEqual(result, expectedBookmark);
    done();
  });
});
