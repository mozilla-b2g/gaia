/* global MockNavigatorDatastore, MockDatastore, Promise */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/shared/js/utilities.js');
requireApp('search/test/unit/mock_search.js');
requireApp('search/js/providers/provider.js');
requireApp('search/js/providers/grid_provider.js');

// Required files for the grid and a mozapp result
require('/shared/js/l10n.js');
require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/elements/gaia_grid/js/grid_layout.js');
require('/shared/elements/gaia_grid/js/grid_view.js');
require('/shared/elements/gaia_grid/script.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/bookmark.js');
require('/shared/js/sync_datastore.js');

suite('search/providers/providers', function() {
  var subject;
  var realDatastore;
  var promiseDone = Promise.resolve({ operation: 'done' });

  var ICON = 'https://mozorg.cdn.mozilla.net/media/img/favicon.ico';

  suiteSetup(function() {
    realDatastore = navigator.getDataStores;
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
    MockNavigatorDatastore._records = {};

    MockDatastore.sync = function() {
      var cursor = {
        next: function() {
          cursor.next = () => promiseDone;

          return Promise.resolve({
            operation: 'add',
            data: {
              url: 'http://mozilla.org',
              name: 'Homepage',
              icon: ICON
            }
          });
        }
      };
      return cursor;
    };
  });

  suiteTeardown(function() {
    navigator.getDataStores = realDatastore;
  });

  setup(function(done) {
    requireApp('search/js/providers/bookmarks.js', function() {
      subject = window.Bookmarks;
      subject.grid = document.createElement('gaia-grid');
      promiseDone.then(function() {
        subject.init().then(done);
      });
    });
  });

  suite('search', function() {
    test('renders data url', function(done) {
      subject.search('mozilla').then((results) => {
        assert.equal(results[0].data.detail.url, 'http://mozilla.org');
        assert.equal(results[0].data.detail.name, 'Homepage');
        assert.equal(results[0].data.detail.id, 'http://mozilla.org');
        assert.equal(results[0].data.detail.icon, ICON);
        done();
      });
    });

    test('search name', function(done) {
      subject.search('homepage').then((results) => {
        assert.equal(results[0].data.detail.name, 'Homepage');
        done();
      });
    });
  });

  suite('get', function() {
    test('ok', function() {
      var bookmark = subject.get('http://mozilla.org');
      assert.equal(bookmark.data.detail.url, 'http://mozilla.org');
      assert.equal(bookmark.data.detail.name, 'Homepage');
      assert.equal(bookmark.data.detail.id, 'http://mozilla.org');
      assert.equal(bookmark.data.detail.icon, ICON);
    });

    test('fail', function() {
      var bookmark = subject.get('http://catanddog.org');
      assert.isNull(bookmark);
    });
  });

});
