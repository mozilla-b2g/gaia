/* global MockNavigatorDatastore, MockDatastore, Promise */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/shared/js/utilities.js');
requireApp('search/test/unit/mock_search.js');
requireApp('search/js/providers/provider.js');
requireApp('search/js/providers/grid_provider.js');
requireApp('search/js/providers/sync_provider.js');

require('/shared/js/l10n.js');
require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');
require('/shared/elements/gaia_grid/script.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/bookmark.js');


suite('Bookmark search provider', function() {
  var subject, realDataStore;

  var promiseDone = Promise.resolve({ operation: 'done' });
  // Example of entry for bookmarks
  // {"type":"url","url":"http://www.meneame.net/",
  //  "name":"Menéame",
  //  "icon":"http://mnmstatic.net/v_14/img/favicons/apple-touch-icon.png",
  //  "id":"http://www.meneame.net/"}

  var bookmark = {
    type: 'url',
    url: 'http://example.com',
    name: 'Example',
    icon: 'http://example.com/icon.png',
    id: 'http://example.com'
  };

  suiteSetup(function(done) {
    realDataStore = navigator.getDataStores;
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;

    MockNavigatorDatastore._records = {};

    window.SettingsListener = {
      observe: function() {}
    };

    MockDatastore.sync = function() {
      var cursor = {
        next: function() {
          cursor.next = () => promiseDone;

          return Promise.resolve({
            operation: 'add',
            data: bookmark
          });
        }
      };
      return cursor;
    };

    requireApp('search/js/providers/bookmarks.js', done);
  });

  suiteTeardown(function() {
    navigator.getDataStores = realDataStore;
    delete window.SettingsListener;
  });

  setup(function() {
    subject = window.Bookmarks;
  });

  suite('initialisation', function() {
    test('check instance variables', function() {
      assert.equal(subject.storeName, 'bookmarks_store');
      assert.isNotNull(subject.store);
    });
  });

  suite('search', function() {
    test('check search results', function(done) {
      subject.search('exa').then(function(results) {
        assert.isNotNull(results);
        assert.isTrue(results.length === 1);
        
        var detail = results[0].data.detail;
        assert.equal(detail.id, bookmark.id);
        assert.equal(detail.name, bookmark.name);
        assert.equal(detail.url, bookmark.url);
        assert.equal(detail.icon, bookmark.icon);
        done();
      });
    });
  });

  suite('other operpations', function() {
    setup(function() {
      this.sinon.stub(MockDatastore, 'sync', function() {
        var cursor = {
          next: function() {
            cursor.next = function() {
              cursor.next = () => promiseDone;

              return Promise.resolve({
                operation: 'remove',
                target: {
                  id: 'http://example.com'
                }
              });
            };
            return Promise.resolve({
              operation: 'add',
              data: bookmark
            });
          }
        };
        return cursor;
      });
    });

    test('check remove', function(done) {
      subject.onDone = function() {
        subject.search('exa').then(function(results) {
          assert.isNotNull(results);
          assert.isTrue(results.length === 0);
          done();
        });
      };
      subject.init();
    });
  });

});
