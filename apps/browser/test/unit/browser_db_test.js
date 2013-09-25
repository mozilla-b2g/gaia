// Stub of Browser object.
var Browser = {
  _doNotCustomize: true,

  getConfigurationData: function browser_getDefaultData(variant, callback) {

    // For all other tests in the suite, we do _not_ want any customizations.
    // We use this handy boolean to skip this step.
    if (this._doNotCustomize) {
      callback({});
      return;
    }

    var mccCode = NumberHelper.zfill(variant.mcc, 3);
    var mncCode = NumberHelper.zfill(variant.mnc, 3);

    // Customization test data.
    var data = {
      '000000': {
        bookmarks: [
          {
            title: 'customize test 1',
            uri: 'http://customize.test.mozilla.org/1'
          },
          {
            title: 'customize test 2',
            uri: 'http://customize.test.mozilla.org/2'
          }
        ],
        searchEngines: [
          {
            title: 'customize search test 1',
            uri: 'http://customize.test.mozilla.org/search/1',
            iconUri: DATA_URI
          }
        ],
        settings: {
          defaultSearchEngine: 'http://customize.test.mozilla.org/search/1'
        }
      }
    };

    // Imitate real getConfigurationData function by creating JSON from our
    // object and parsing it before returning it.
    var json = JSON.stringify(data);

    // Select the data from the object.
    var parsed = JSON.parse(json);

    // Done, notify callback.
    callback(parsed[mccCode + mncCode]);

    return;
  },

  setSearchProvider: function browser_setSearchProvider(uri, title, iconUri) {
    return;
  }
};

requireApp('browser/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('browser/shared/js/simple_operator_variant_helper.js');

requireApp('browser/js/utilities.js');
requireApp('browser/js/browser_db.js');

const DATA_URI =
    'data:image/x-icon;base64,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';

var clearBrowserStores = function(done) {
  BrowserDB.db.open(function() {
    BrowserDB.db.clearPlaces(function() {
      BrowserDB.db.clearVisits(function() {
        BrowserDB.db.clearIcons(function() {
          BrowserDB.db.clearBookmarks(function() {
            BrowserDB.db.clearSearchEngines(function() {
              BrowserDB.db.clearSettings(function() {
                done();
              });
            });
          });
        });
      });
    });
  });
};

suite('BrowserDB', function() {
  var realMozSettings = null;
  this.timeout(5000);

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  suite('BrowserDB.operatorVariantCustomization', function() {
    setup(function(done) {
      // For these series of tests, we *do* want customizations to run.
      Browser._doNotCustomize = false;
      // And we want to manually initialize the DB.
      BrowserDB.init(function() {
        var itemsToAdd = 3;
        BrowserDB.populate(0, function() {
          if (--itemsToAdd <= 0) {
            done();
          }
        });
      });
    });

    teardown(function(done) {
      Browser._doNotCustomize = true;
      clearBrowserStores(done);
    });

    test('Operator Variant Customization -- Bookmarks', function(done) {
      BrowserDB.db.getAllBookmarks(function(bookmarks) {
        assert.equal(bookmarks.length, 2);

        // We can't yet guarantee order of bookmarks (bug 895807)
        if (bookmarks[0].uri == 'http://customize.test.mozilla.org/2') {
          assert.equal(bookmarks[0].uri, 'http://customize.test.mozilla.org/2');
          assert.equal(bookmarks[0].title, 'customize test 2');

          assert.equal(bookmarks[1].uri, 'http://customize.test.mozilla.org/1');
          assert.equal(bookmarks[1].title, 'customize test 1');
        } else {
          assert.equal(bookmarks[1].uri, 'http://customize.test.mozilla.org/2');
          assert.equal(bookmarks[1].title, 'customize test 2');

          assert.equal(bookmarks[0].uri, 'http://customize.test.mozilla.org/1');
          assert.equal(bookmarks[0].title, 'customize test 1');
        }

        done();
      });
    });

    test('Operator Variant Customization -- Search Engines', function(done) {
      BrowserDB.getSearchEngine(
        'http://customize.test.mozilla.org/search/1',
        function(searchEngine) {
          assert.equal(searchEngine.uri,
                       'http://customize.test.mozilla.org/search/1');
          assert.equal(searchEngine.title,
                       'customize search test 1');

          done();
        }
      );
    });
  });

  suite('BrowserDB.db', function() {
    setup(function(done) {
      clearBrowserStores(done);
    });

    teardown(function(done) {
      clearBrowserStores(done);
    });

    test('createPlace', function(done) {
      BrowserDB.db.createPlace('http://mozilla.org/test1', function() {
        done();
      });
    });

    test('getPlace', function(done) {
      BrowserDB.db.createPlace('http://mozilla.org/test2', function() {
        BrowserDB.db.getPlace('http://mozilla.org/test2', function(place) {
          done(function() {
            assert.equal(place.title, 'http://mozilla.org/test2');
          });
        });
      });
    });

    test('getPlace - not found', function(done) {
      BrowserDB.db.getPlace('http://mozilla.org/doesnotexist',
        function(place) {
        done(function() {
          assert.equal(place, undefined);
        });
      });
    });

    test('saveBookmark', function(done) {
      var bookmark = {
        uri: 'http://mozilla.org/test1',
        title: 'Mozilla',
        timestamp: new Date().valueOf()
      };
      BrowserDB.db.saveBookmark(bookmark, function() {
        done();
      });
    });

    test('getBookmark', function(done) {
      var bookmark = {
        uri: 'http://mozilla.org/test2',
        title: 'Mozilla'
      };
      BrowserDB.db.saveBookmark(bookmark, function() {
        BrowserDB.db.getBookmark('http://mozilla.org/test2',
          function(bookmark) {
          done(function() {
            assert.equal(bookmark.title, 'Mozilla');
          });
        });
      });
    });

    test('getBookmark - not found', function(done) {
      BrowserDB.db.getBookmark('http://mozilla.org/doesnotexist',
        function(bookmark) {
        done(function() {
          assert.equal(bookmark, undefined);
        });
      });
    });

    test('deleteBookmark', function(done) {
      var bookmark = {
        uri: 'http://mozilla.org/test3',
        title: 'Mozilla'
      };
      BrowserDB.db.saveBookmark(bookmark, function() {
        BrowserDB.db.deleteBookmark('http://mozilla.org/test3',
            function() {
          BrowserDB.db.getBookmark('http://mozilla.org/test3',
            function(bookmark) {
            done(function(bookmark) {
              assert.equal(bookmark, undefined);
            });
          });
        });
      });
    });

    test('updatePlace', function(done) {
      var place = {
        uri: 'http://mozilla.org/test3',
        title: 'Mozilla'
      };
      BrowserDB.db.updatePlace(place, function() {
        place.title = 'Mozilla3';
        BrowserDB.db.updatePlace(place, function() {
          BrowserDB.db.getPlace('http://mozilla.org/test3',
            function(place) {
            done(function() {
              assert.equal(place.title, 'Mozilla3');
            });
          });
        });
      });
    });

    test('updatePlaceScreenshot', function(done) {
      var uri = 'http://mozilla.org/test4';
      BrowserDB.db.updatePlaceScreenshot(uri, DATA_URI, function() {
        BrowserDB.db.getPlace(uri, function(place) {
          done(function() {
            assert.equal(place.screenshot, DATA_URI);
          });
        });
      });
    });

    test('getPlacesByFrecency', function(done) {
      var place1 = {
        uri: 'http://mozilla.org/test1',
        frecency: 3
      };
      var place2 = {
        uri: 'http://mozilla.org/test2',
        frecency: 2
      };
      var place3 = {
        uri: 'http://mozilla.org/test3',
        frecency: 1
      };
      BrowserDB.db.updatePlace(place1, function() {
        BrowserDB.db.updatePlace(place2, function() {
          BrowserDB.db.updatePlace(place3, function() {
            BrowserDB.db.getPlacesByFrecency(2, null, function(topSites) {
              done(function() {
                assert.equal(2, topSites.length);
                assert.equal(topSites[0].uri, 'http://mozilla.org/test1');
              });
            });
          });
        });
      });
    });

    test('saveIcon', function(done) {
      // Let's just use content-type text, a blob is a blob.
      var blob = new Blob(['hello', ' world'], {type: 'text/plain'});
      var iconEntry = {
        uri: 'http://mozilla.org/favicon.ico',
        data: blob,
        expiration: new Date().valueOf()
      };
      BrowserDB.db.saveIcon(iconEntry, function() {
        done();
      });
    });

    test('getIcon', function(done) {
      // Let's just use content-type text, a blob is a blob.
      var blob = new Blob(['hello', ' world'], {type: 'text/plain'});
      var iconEntry = {
        uri: 'http://mozilla.org/favicon.ico',
        data: blob,
        expiration: new Date().valueOf()
      };
      BrowserDB.db.saveIcon(iconEntry, function() {
        BrowserDB.db.getIcon('http://mozilla.org/favicon.ico', function() {
          done();
        });
      });
    });

    test('saveIcon', function(done) {
      // Let's just use text, a blob is a blob.
      var blob = new Blob(['hello', ' world'], {type: 'text/plain'});
      var iconEntry = {
        uri: 'http://mozilla.org/favicon.ico',
        data: blob,
        expiration: new Date().valueOf()
      };
      BrowserDB.db.saveIcon(iconEntry, function() {
        done();
      });
    });

    test('getAllBookmarks', function(done) {
      BrowserDB.addBookmark('http://mozilla.org/test1', 'Mozilla', function() {
        BrowserDB.addBookmark('http://mozilla.org/test2', 'Mozilla',
          function() {
          BrowserDB.db.getAllBookmarks(function(bookmarks) {
            done(function() {
              assert.equal(bookmarks.length, 2);
            });
          });
        });
      });
    });

    test('getAllBookmarkUris', function(done) {
      BrowserDB.addBookmark('http://mozilla.org/test1', 'Mozilla', function() {
        BrowserDB.addBookmark('http://mozilla.org/test2', 'Mozilla',
            function() {
          BrowserDB.db.getAllBookmarkUris(function(uris) {
            done(function() {
              assert.equal(uris.length, 2);
            });
          });
        });
      });
    });

    test('resetPlaceFrecency', function(done) {
      BrowserDB.addPlace('http://mozilla.org/test8', function() {
        BrowserDB.updateFrecency('http://mozilla.org/test8', function() {
          BrowserDB.db.resetPlaceFrecency('http://mozilla.org/test8',
            function() {
            BrowserDB.db.getPlace('http://mozilla.org/test8', function(place) {
              done(function() {
                assert.equal(null, place.frecency);
              });
            });
          });
        });
      });
    });

    test('saveSearchEngine', function(done) {
      var search_engine = {
        uri: 'http://google.com/',
        title: 'Google',
        iconUri: DATA_URI
      };
      BrowserDB.db.saveSearchEngine(search_engine, function() {
        done();
      });
    });

    test('getSearchEngine', function(done) {
      var search_engine = {
        uri: 'http://google.com/',
        title: 'Google',
        iconUri: DATA_URI
      };
      BrowserDB.db.saveSearchEngine(search_engine, function() {
        BrowserDB.db.getSearchEngine('http://google.com/',
          function(search_engine) {
          done(function() {
            assert.equal(search_engine.title, 'Google');
            assert.equal(search_engine.iconUri, DATA_URI);
          });
        });
      });
    });

    test('getAllSearchEngines', function(done) {
      var search_engine1 = {
        uri: 'http://google.com/search',
        title: 'Google',
        iconUri: DATA_URI
      };
      var search_engine2 = {
        uri: 'http://yahoo.com/search',
        title: 'Yahoo',
        iconUri: DATA_URI
      };
      BrowserDB.db.saveSearchEngine(search_engine1, function() {
        BrowserDB.db.saveSearchEngine(search_engine2, function() {
          BrowserDB.db.getAllSearchEngines(function(engines) {
            done(function() {
              assert.equal(engines.length, 2);
            });
          });
        });
      });
    });

  });

  suite('BrowserDB', function() {
    setup(function(done) {
      clearBrowserStores(done);
    });

    teardown(function(done) {
      clearBrowserStores(done);
    });

    test('addPlace', function(done) {
      BrowserDB.addPlace('http://mozilla.org/test4', function() {
        done();
      });
    });

    test('setPageTitle', function(done) {
      BrowserDB.addPlace('http://mozilla.org/test5', function() {
        BrowserDB.setPageTitle('http://mozilla.org/test5',
          'Mozilla5', function() {
          BrowserDB.db.getPlace('http://mozilla.org/test5',
            function(place) {
            done(function() {
              assert.equal(place.title, 'Mozilla5');
            });
          });
        });
      });
    });

    test('setAndLoadIconForPage', function(done) {
      BrowserDB.setAndLoadIconForPage('http://mozilla.org/test6',
        DATA_URI, function() {
        BrowserDB.db.getIcon(DATA_URI, function(iconEntry) {
          done(function() {
            assert.equal(true, iconEntry.expiration > new Date().valueOf());
            var twoDaysAway = new Date().valueOf() + 172800000;
            assert.equal(true, iconEntry.expiration < twoDaysAway);
            assert.equal(2550, iconEntry.data.size);
            assert.equal('image/x-icon', iconEntry.data.type);
          });
        });
      });
    });

    test('addVisit', function(done) {
      BrowserDB.addVisit('http://mozilla.org/test8', function() {
        done();
      });
    });

    test('addVisit - existing place', function(done) {
      BrowserDB.addPlace('http://mozilla.org/test9', function() {
        BrowserDB.addVisit('http://mozilla.org/test9', function() {
          done();
        });
      });
    });

    test('addBookmark', function(done) {
      BrowserDB.addBookmark('http://mozilla.org/test7', 'Test 7', function() {
        BrowserDB.getBookmark('http://mozilla.org/test7', function(bookmark) {
          done(function() {
            assert.equal(bookmark.title, 'Test 7');
            assert.equal(true, bookmark.timestamp > 0);
            var now = new Date().valueOf();
            assert.equal(true, bookmark.timestamp <= now);
          });
        });
      });
    });

    test('updateBookmark', function(done) {
      BrowserDB.addBookmark('http://mozilla.org/test7', 'Test 7', function() {
        BrowserDB.updateBookmark('http://mozilla.org/test7', 'Test 8',
          function() {
          BrowserDB.getBookmark('http://mozilla.org/test7', function(bookmark) {
            done(function() {
              assert.equal(bookmark.title, 'Test 8');
            });
          });
        });
      });
    });

    test('updateBookmark - not found', function(done) {
      BrowserDB.updateBookmark('http://mozilla.org/test7', 'Test 7',
        function() {
        BrowserDB.getBookmark('http://mozilla.org/test7', function(bookmark) {
          done(function() {
            assert.equal(bookmark.title, 'Test 7');
            assert.equal(true, bookmark.timestamp > 0);
            var now = new Date().valueOf();
            assert.equal(true, bookmark.timestamp <= now);
          });
        });
      });
    });

    test('updateFrecency', function(done) {
      BrowserDB.addPlace('http://mozilla.org/test8', function() {
        BrowserDB.updateFrecency('http://mozilla.org/test8', function() {
          BrowserDB.updateFrecency('http://mozilla.org/test8', function() {
            BrowserDB.db.getPlace('http://mozilla.org/test8', function(place) {
              done(function() {
                assert.equal(2, place.frecency);
              });
            });
          });
        });
      });
    });

    test('addSearchEngine', function(done) {
      var data = {
        uri: 'http://google.com/',
        title: 'Google',
        iconUri: DATA_URI
      };
      BrowserDB.addSearchEngine(data, function() {
        BrowserDB.getSearchEngine('http://google.com/',
          function(search_engine) {
          done(function() {
            assert.equal(search_engine.title, 'Google');
            assert.equal(search_engine.uri, 'http://google.com/');
            assert.equal(search_engine.iconUri, DATA_URI);
          });
        });
      });
    });

    test('updateSetting', function(done) {
      BrowserDB.updateSetting('test_value', 'test_key', function() {
        BrowserDB.getSetting('test_key', function(setting) {
          done(function() {
            assert.equal(setting, 'test_value');
          });
        });
      });
    });

  });

});
