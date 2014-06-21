'use strict';

/* global MocksHelper, MockIndexedDB, ItemStore, configurator  */

require('/shared/js/l10n.js');
require('/shared/test/unit/mocks/mock_indexedDB.js');
require('/test/unit/mock_application_source.js');
require('/test/unit/mock_bookmark_source.js');
require('/test/unit/mock_collection_source.js');
require('/test/unit/mock_configurator.js');

require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/elements/gaia_grid/script.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/divider.js');
require('/shared/elements/gaia_grid/js/items/collection.js');
require('/shared/elements/gaia_grid/js/items/mozapp.js');

// Unit tests for item library
requireApp('verticalhome/js/stores/item.js');

var mocksHelperForItemStore = new MocksHelper([
  'ApplicationSource',
  'BookmarkSource',
  'CollectionSource'
]).init();

suite('item.js >', function() {
  var mockIndexedDB;

  var dataStoreItems = {
    '0': {
      'type': 'app',
      'manifestURL': 'app://gallery.gaiamobile.org/manifest.webapp',
      'index': 0
    },
    '1': {
      'type': 'app',
      'manifestURL': 'app://clock.gaiamobile.org/manifest.webapp',
      'index': 1
    },
    '2': {
      'type': 'app',
      'manifestURL': 'app://keyboard.gaiamobile.org/manifest.webapp',
      'index': 2
    },
    '3': {
      'type': 'app',
      'manifestURL': 'app://camera.gaiamobile.org/manifest.webapp',
      'index': 3
    },
    '4': {
      'type': 'app',
      'manifestURL': 'app://music.gaiamobile.org/manifest.webapp',
      'index': 4
    },
    '5': {
      'type': 'app',
      'manifestURL': 'app://browser.gaiamobile.org/manifest.webapp',
      'index': 5
    },
    '6': {
      'type': 'app',
      'manifestURL': 'app://email.gaiamobile.org/manifest.webapp',
      'index': 6
    },
    '7': {
      'type': 'app',
        'manifestURL': 'app://communications.gaiamobile.org/manifest.webapp',
        'entryPoint': 'contacts',
        'index': 7
    },
    '8': {
      'type': 'app',
      'manifestURL': 'app://communications.gaiamobile.org/manifest.webapp',
      'entryPoint': 'dialer',
      'index': 8
    }
  };

  mocksHelperForItemStore.attachTestHelpers();

  suiteSetup(function() {
    mockIndexedDB = new MockIndexedDB();
    mocksHelperForItemStore.suiteSetup();
  });

  suiteTeardown(function() {
    mocksHelperForItemStore.suiteTeardown();
  });

  setup(function() {
    mocksHelperForItemStore.setup();
  });

  teardown(function() {
    mocksHelperForItemStore.teardown();
  });

  test('ItemStore new >', function() {
    mockIndexedDB.options.upgradeNeededDbs = ['verticalhome'];

    mockIndexedDB.storedDataDbs = {
      'verticalhome': dataStoreItems
    };
    /*jshint unused:false*/
    var itemStore = new ItemStore();

    var savedElem = mockIndexedDB.dbs[0].receivedData;
    var grid = configurator.getGrid();

    var gridInd = 0;
    var keys = Object.keys(savedElem);
    for (var i = 0, iLen = savedElem.length, gLen = grid.length;
         i < iLen && gridInd < gLen; i++) {
      if (savedElem[i].type === 'app') {
          assert.equal(savedElem[i].manifestURL, grid[gridInd][0].manifestURL);
        if (savedElem[i].entryPoint) {
          assert.equal(savedElem[i].entryPoint, grid[gridInd][0].entry_point);
        }
        grid[gridInd].shift();
      } else if (savedElem[i].type === 'divider') {
        gridInd += 1;
      }
    }
    var moreDivider = false;
    for (;i < iLen && !moreDivider; i++) {
      moreDivider = savedElem[keys[i]].type === 'divider';
    }
    assert.isFalse(moreDivider);
    for (i = 0, iLen = grid.length; i < iLen; i++) {
      assert.equal(grid[i].length, 0);
    }
  });
});
