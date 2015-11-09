'use strict';

/* global MocksHelper, MockIndexedDB, ItemStore, configurator  */

require('/shared/js/l10n.js');
require('/shared/test/unit/mocks/mock_indexedDB.js');
require('/test/unit/mock_application_source.js');
require('/test/unit/mock_configurator.js');

require('/shared/elements/gaia_grid/js/grid_icon_renderer.js');
require('/shared/elements/gaia_grid/script.js');
require('/shared/elements/gaia_grid/js/items/grid_item.js');
require('/shared/elements/gaia_grid/js/items/mozapp.js');

// Unit tests for item library
requireApp('verticalhome/js/stores/item.js');

var mocksHelperForItemStore = new MocksHelper([
  'ApplicationSource'
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
    window.dispatchEvent(new CustomEvent('configuration-ready'));
    window.dispatchEvent(new CustomEvent('gaiagrid-cached-icons-rendered'));

    var savedElem = mockIndexedDB.dbs[0].receivedData;
    var grid = configurator.getGrid();

    var keys = Object.keys(savedElem);
    for (var i = 0, iLen = savedElem.length; i < iLen; i++) {
      if (savedElem[i].type === 'app') {
          assert.equal(savedElem[i].manifestURL, grid[0].manifestURL);
        if (savedElem[i].entryPoint) {
          assert.equal(savedElem[i].entryPoint, grid[0].entry_point);
        }
        grid.shift();
      }
    }

    for (i = 0, iLen = grid.length; i < iLen; i++) {
      assert.equal(grid[i].length, 0);
    }
  });
});
