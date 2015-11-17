'use strict';
/* global SyncBrowserDB */
/* exported Browser */
/* jshint latedef:false */

requireApp('browser/shared/test/unit/mocks/' +
           'mock_navigator_moz_set_message_handler.js');

/* jshint maxlen:false */
const DATA_URI =
    'data:image/x-icon;base64,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';
/* jshint maxlen:80 */
const DEFAULT_FAVICON = 'style/images/default-fav.svg';

requireApp('browser/js/sync/db.js');

var clearBrowserStores = function(done) {
  SyncBrowserDB.db.open(function() {
    Promise.all([
      new Promise(SyncBrowserDB.db.clearPlaces),
      new Promise(SyncBrowserDB.db.clearVisits),
      new Promise(SyncBrowserDB.db.clearIcons),
      new Promise(SyncBrowserDB.db.clearBookmarks)
    ]).then(() => {
      done();
    });
  });
};

var bookmarkGenerator = (amount, done, parentid) => {
  var list = [];
  function item(i) {
    return {
      id: 'FXSYNCID_00' + i,
      bmkUri: 'http://mozilla.org/test' + i,
      title: 'Mozilla',
      parentid: parentid ? parentid : 'FXS_P_ID_00' + i,
      timestamp: Date.now()
    };
  }

  var i = 0;

  function wrapper() {
    if (i < amount) {
      var t = item(i);
      list.push(t);
      SyncBrowserDB.db.saveBookmark(t, wrapper);
      i++;
    } else {
      done(list);
    }
  }

  wrapper();
};

var historyGenerator = (amount, done, timeOffset) => {
  var list = [];
  function item(i) {
    return {
      fxsyncId: 'FXSYNCID_00' + i,
      uri: 'http://mozilla.org/test' + i,
      title: 'Mozilla',
      timestamp: timeOffset + i * 10
    };
  }

  var i = 0;

  function wrapper() {
    if (i < amount) {
      var t = item(i);
      list.push(t);
      SyncBrowserDB.db.createRawHistory(t, wrapper);
      i++;
    } else {
      done(list);
    }
  }

  wrapper();
};

window.Awesomescreen = {
  DEFAULT_FAVICON: DEFAULT_FAVICON
};

suite('SyncBrowserDB', function() {
  suite('SyncBrowserDB.db', function() {
    setup(function(done) {
      clearBrowserStores(done);
    });

    teardown(function(done) {
      clearBrowserStores(done);
    });

    test('createPlace & getPlace', function(done) {
      const URL = 'http://mozilla.org/test1';
      SyncBrowserDB.db.createPlace(URL, () => {
        SyncBrowserDB.db.getPlace(URL, place => {
          assert.equal(place.title, URL);
          done();
        });
      });
    });

    test('createRawHistory & getHistory', function(done) {
      var example = {
        fxsyncId: 'FXSYNCID_001',
        uri: 'http://mozilla.org/test1',
        title: 'Mozilla',
        timestamp: Date.now()
      };
      SyncBrowserDB.db.createRawHistory(example, () => {
        SyncBrowserDB.db.getHistory(10, places => {
          assert.equal(places.length, 1);
          example.iconUri = DEFAULT_FAVICON;
          assert.deepEqual(places[0], example);
          done();
        });
      });
    });


    test('getPlace - not found', function(done) {
      const NONEXIST_URL = 'http://mozilla.org/doesnotexist';
      SyncBrowserDB.db.getPlace(NONEXIST_URL, place => {
        assert.equal(place, undefined);
        done();
      });
    });

    test('saveBookmark && getBookmark', function(done) {
      var example = {
        id: 'FXSYNCID_001',
        bmkUri: 'http://mozilla.org/test1',
        title: 'Mozilla',
        parentid: 'FXS_P_ID_001',
        timestamp: Date.now()
      };
      SyncBrowserDB.db.saveBookmark(example, () => {
        SyncBrowserDB.db.getBookmark(example.id, bookmark => {
          assert.deepEqual(bookmark, example);
          done();
        });
      });
    });

    test('saveBookmark && getBookmarkByUri', function(done) {
      var example = {
        id: 'FXSYNCID_002',
        bmkUri: 'http://mozilla.org/test2',
        title: 'Mozilla',
        parentid: 'FXS_P_ID_002',
        timestamp: Date.now()
      };
      SyncBrowserDB.db.saveBookmark(example, () => {
        SyncBrowserDB.db.getBookmarkByUri(example.bmkUri, bookmark => {
          assert.deepEqual(bookmark, example);
          done();
        });
      });
    });

    test('getBookmarkByParentId', function(done) {
      var example = {
        id: 'FXSYNCID_001',
        bmkUri: 'http://mozilla.org/test1',
        title: 'Mozilla',
        parentid: 'FXS_P_ID_001',
        timestamp: Date.now()
      };
      SyncBrowserDB.db.saveBookmark(example, () => {
        SyncBrowserDB.db.getBookmarkByParentId(example.parentid, bookmark => {
          assert.equal(bookmark.length, 1);
          assert.deepEqual(bookmark[0], example);
          done();
        });
      });
    });

    test('getBookmarkByUri - not found', function(done) {
      const NONEXIST_URL = 'http://mozilla.org/doesnotexist';
      SyncBrowserDB.db.getBookmarkByUri(NONEXIST_URL, bookmark => {
        assert.equal(bookmark, undefined);
        done();
      });
    });

    test('getAllBookmarks', function(done) {
      const RECORD_SIZE = 10;
      bookmarkGenerator(RECORD_SIZE, records => {
        SyncBrowserDB.db.getAllBookmarks(bookmarks => {
          assert.equal(bookmarks.length, RECORD_SIZE);
          // Sort by timestamp, so we did a reversing comparison here.
          for (var i = 0; i < RECORD_SIZE; i++) {
            assert.deepEqual(bookmarks[i], records[RECORD_SIZE -1 -i]);
          }
          done();
        });
      });
    });

    test('getAllBookmarkUris', function(done) {
      const RECORD_SIZE = 10;
      bookmarkGenerator(RECORD_SIZE, records => {
        SyncBrowserDB.db.getAllBookmarkUris(bookmarkUris => {
          assert.equal(bookmarkUris.length, RECORD_SIZE);
          // Sort by timestamp, so we did a reversing comparison here.
          for (var i = 0; i < RECORD_SIZE; i++) {
            assert.deepEqual(bookmarkUris[i],
              records[RECORD_SIZE -1 -i].bmkUri);
          }
          done();
        });
      });
    });

    test('deleteBookmark', function(done) {
      var example = {
        id: 'FXSYNCID_003',
        bmkUri: 'http://mozilla.org/test3',
        title: 'Mozilla',
        parentid: 'FXS_P_ID_003',
        timestamp: Date.now()
      };
      SyncBrowserDB.db.saveBookmark(example, () => {
        SyncBrowserDB.db.deleteBookmark('FXSYNCID_003', () => {
          SyncBrowserDB.db.getBookmark('FXSYNCID_003', bookmark => {
            assert.equal(bookmark, undefined);
            done();
          });
        });
      });
    });

    test('updatePlaceScreenshot', function(done) {
      var uri = 'http://mozilla.org/test4';
      SyncBrowserDB.db.updatePlaceScreenshot(uri, DATA_URI, () => {
        SyncBrowserDB.db.getPlace(uri, place => {
          assert.equal(place.screenshot, DATA_URI);
          done();
        });
      });
    });

    test('saveIcon', function(done) {
      var blob = new Blob(['hello', ' world'], {type: 'text/plain'});
      var iconEntry = {
        uri: 'http://mozilla.org/favicon.ico',
        data: blob,
        expiration: Date.now()
      };
      SyncBrowserDB.db.saveIcon(iconEntry, () => {
        SyncBrowserDB.db.getIcon(iconEntry.uri, null, (e) => {
          assert.deepEqual(e, iconEntry);
          done();
        });
      });
    });

  });

  suite('SyncBrowserDB', function() {
    setup(function(done) {
      clearBrowserStores(done);
    });

    teardown(function(done) {
      clearBrowserStores(done);
    });

    test('updateRawBookmark & getBookmark by id', function(done) {
      var example = {
        id: 'FXSYNCID_003',
        bmkUri: 'http://mozilla.org/test3',
        title: 'Mozilla',
        parentid: 'FXS_P_ID_003',
        timestamp: Date.now()
      };
      SyncBrowserDB.updateRawBookmark(example, () => {
        SyncBrowserDB.getBookmark(example.id, bookmark => {
          assert.deepEqual(example, bookmark);
          done();
        });
      });
    });

    test('updateRawBookmark & getBookmark by {id}', function(done) {
      var example = {
        id: 'FXSYNCID_003',
        bmkUri: 'http://mozilla.org/test3',
        title: 'Mozilla',
        parentid: 'FXS_P_ID_003',
        timestamp: Date.now()
      };
      SyncBrowserDB.updateRawBookmark(example, () => {
        SyncBrowserDB.getBookmark({id: example.id}, bookmark => {
          assert.deepEqual(example, bookmark);
          done();
        });
      });
    });

    test('updateRawBookmark & getBookmark by {bmkUri}', function(done) {
      var example = {
        id: 'FXSYNCID_003',
        bmkUri: 'http://mozilla.org/test3',
        title: 'Mozilla',
        parentid: 'FXS_P_ID_003',
        timestamp: Date.now()
      };
      SyncBrowserDB.updateRawBookmark(example, () => {
        SyncBrowserDB.getBookmark({bmkUri: example.bmkUri}, bookmark => {
          assert.deepEqual(example, bookmark);
          done();
        });
      });
    });

    test('updateRawBookmark & getBookmark by {parentid}', function(done) {
      var example = {
        id: 'FXSYNCID_003',
        bmkUri: 'http://mozilla.org/test3',
        title: 'Mozilla',
        parentid: 'FXS_P_ID_003',
        timestamp: Date.now()
      };
      SyncBrowserDB.updateRawBookmark(example, () => {
        SyncBrowserDB.getBookmark({parentid: example.parentid}, bookmarks => {
          assert.equal(bookmarks.length, 1);
          assert.deepEqual(example, bookmarks[0]);
          done();
        });
      });
    });

    test('getBookmark by {parentid}, sorted by children array', function(done) {
      var example = {
        id: 'FXS_P_ID_001',
        type: 'folder',
        title: 'Mozilla',
        children: ['FXSYNCID_003', 'FXSYNCID_001',
          'FXSYNCID_000', 'FXSYNCID_002'],
        parentid: 'FXS_P_ID_000',
        timestamp: Date.now()
      };
      SyncBrowserDB.updateRawBookmark(example, () => {
        bookmarkGenerator(4, rawRecords => {
          SyncBrowserDB.getBookmark({parentid: example.id}, bookmarks => {
            assert.deepEqual(bookmarks[0], rawRecords[3]);
            assert.deepEqual(bookmarks[1], rawRecords[1]);
            assert.deepEqual(bookmarks[2], rawRecords[0]);
            assert.deepEqual(bookmarks[3], rawRecords[2]);
            done();
          });
        }, 'FXS_P_ID_001');
      });
    });

    test('removeBookmark', function(done) {
      var example = {
        id: 'FXSYNCID_003',
        bmkUri: 'http://mozilla.org/test3',
        title: 'Mozilla',
        parentid: 'FXS_P_ID_003',
        timestamp: Date.now()
      };
      SyncBrowserDB.updateRawBookmark(example, () => {
        SyncBrowserDB.removeBookmark(example.id, () => {
          SyncBrowserDB.getBookmark(example.id, bookmark => {
            assert.equal(bookmark, undefined);
            done();
          });
        });
      });
    });

    test('clearBookmarks', function(done) {
      bookmarkGenerator(10, (rawRecords) => {
        SyncBrowserDB.clearBookmarks().then(() => {
          SyncBrowserDB.db.getAllBookmarks(bookmarks => {
            assert.isArray(bookmarks);
            assert.equal(bookmarks.length, 0);
            done();
          });
        });
      });
    });

    test('updateRawHistory & removeHistory', function(done) {
      var example = {
        fxsyncId: 'FXSYNCID_003',
        uri: 'http://mozilla.org/test3',
        title: 'Mozilla',
        timestamp: Date.now()
      };
      SyncBrowserDB.updateRawHistory(example, () => {
        SyncBrowserDB.removeHistory(example.uri, bookmark => {
          assert.equal(bookmark, undefined);
          done();
        });
      });
    });

    test('clearHistoryDeep', function(done) {
      historyGenerator(10, (rawRecords) => {
        SyncBrowserDB.clearHistoryDeep().then(() => {
          SyncBrowserDB.db.getHistory(10000, history => {
            assert.isArray(history);
            assert.equal(history.length, 0);
            done();
          });
        });
      }, 10000);
    });

    test('getHistoryByTime', function(done) {
      historyGenerator(10, (rawRecords) => {
        SyncBrowserDB.getHistoryByTime(10075, 10085, false, false, history => {
          assert.equal(history.length, 1);
          rawRecords[8].iconUri = DEFAULT_FAVICON;
          assert.deepEqual(history[0], rawRecords[8]);
          done();
        });
      }, 10000);
    });

    test('getHistoryByTime with timestamp equal=true', function(done) {
      historyGenerator(10, (rawRecords) => {
        SyncBrowserDB.getHistoryByTime(10070, 10080, true, true, history => {
          assert.equal(history.length, 2);
          rawRecords[7].iconUri = DEFAULT_FAVICON;
          rawRecords[8].iconUri = DEFAULT_FAVICON;
          assert.deepEqual(history[0], rawRecords[8]);
          assert.deepEqual(history[1], rawRecords[7]);
          done();
        });
      }, 10000);
    });

    test('getHistoryTimestamp with equal=true / dir=prev', function(done) {
      historyGenerator(10, (rawRecords) => {
        SyncBrowserDB.getHistoryTimestamp(10070, 'prev', true, ts => {
          assert.equal(ts, 10070);
          done();
        });
      }, 10000);
    });

    test('getHistoryTimestamp with equal=false / dir=prev', function(done) {
      historyGenerator(10, (rawRecords) => {
        SyncBrowserDB.getHistoryTimestamp(10070, 'prev', false, ts => {
          assert.equal(ts, 10060);
          done();
        });
      }, 10000);
    });

    test('getHistoryTimestamp with equal=true / dir=next', function(done) {
      historyGenerator(10, (rawRecords) => {
        SyncBrowserDB.getHistoryTimestamp(10075, 'next', true, ts => {
          assert.equal(ts, 10080);
          done();
        });
      }, 10000);
    });

    test('getHistoryTimestamp with equal=false / dir=next', function(done) {
      historyGenerator(10, (rawRecords) => {
        SyncBrowserDB.getHistoryTimestamp(10075, 'next', false, ts => {
          assert.equal(ts, 10080);
          done();
        });
      }, 10000);
    });

  });

});
