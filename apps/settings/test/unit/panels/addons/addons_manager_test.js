'use strict';

suite('addons manager test > ', function() {
  var mockAppsCache;
  var mockMozApps;
  var addonsManager;
  var realMozApps;

  var modules = [
    'unit/mock_apps_cache',
    'unit/mock_moz_apps',
    'panels/addons/addons_manager'
  ];

  var maps = {
    'panels/addons/addons_manager': {
      'modules/navigator/mozApps': 'unit/mock_moz_apps',
      'modules/apps_cache': 'unit/mock_apps_cache'
    }
  };

  var mock_app1 = {
    manifest: {
      name: 'Addon 1',
      role: 'addon'
    },
    manifestURL: 'app1ManifestUrl'
  };

  var mock_app2 = {
    manifest: {
      name: 'Addon 2',
      role: 'addon'
    },
    manifestURL: 'app2ManifestUrl'
  };

  var mock_app3 = {
    manifest: {
      name: 'Normal app',
      type: 'certified'
    },
    manifestURL: 'app3ManifestUrl'
  };

  suiteSetup(function(done) {
    testRequire(modules, maps, function(MockAppsCache, MockMozApps,
      AddonsManager) {
        mockAppsCache = MockAppsCache;
        mockMozApps = MockMozApps;
        mockAppsCache._apps = [mock_app1, mock_app2, mock_app3];
        realMozApps = window.navigator.mozApps;
        window.navigator.mozApps = mockMozApps;
        addonsManager = AddonsManager();
        done();
    });
  });

  suiteTeardown(function() {
    window.navigator.mozApps = realMozApps;
  });

  setup(function() {
    addonsManager.init();
  });

  suite('Addons Manager initialization >', function() {
    test('Detect addons', function() {
      assert.isNotNull(addonsManager.addons);
      assert.isTrue(addonsManager.addons.length === 2);
    });
  });

  suite('addon management >', function() {
    test('on addon install', function() {
      var mock_app4 = {
        manifest: {
          name: 'new addon',
          role: 'addon'
        },
        manifestURL: 'app3ManifestUrl'
      };
      var evt = {
        type: 'install',
        application: mock_app4
      };
      addonsManager._updateAddons(evt);
      assert.isTrue(addonsManager.length === 3);
    });

    test('on addon uninstall', function() {
      var evt = {
        type: 'uinstall',
        application: mock_app2
      };

      addonsManager._updateAddons(evt);
      assert.isTrue(addonsManager.length === 2);
    });

    test('install addon that exists', function() {
      var evt = {
        type: 'install',
        application: mock_app2
      };
      addonsManager._updateAddons(evt);
      assert.isTrue(addonsManager.length === 2);
    });
  });

  suite('addons utilities >', function() {
    test('already exists', function() {
      assert.isTrue(addonsManager._findAddonIndex(mock_app1) === 0);
      assert.isTrue(addonsManager._alreadyExists(mock_app1));
    });
  });
});
