/* global MockPermissionSettings */

'use strict';
suite('app permission list > ', function() {
  var permissionList;
  var mockAppsCache;
  var mockMozApps;

  var modules = [
    'unit/mock_apps_cache',
    'unit/mock_moz_apps',
    'panels/app_permissions_list/app_permissions_list'
  ];

  var maps = {
    'panels/app_permissions_list/app_permissions_list': {
      'shared/manifest_helper': 'shared_mocks/mock_manifest_helper',
      'modules/settings_service': 'unit/mock_settings_service',
      'shared/settings_listener': 'shared_mocks/mock_settings_listener',
      'modules/navigator/mozApps': 'unit/mock_moz_apps',
      'modules/apps_cache': 'unit/mock_apps_cache',
      'modules/navigator/mozPermissionSettings':
        'shared_mocks/mock_permission_settings'
    }
  };

  var mock_listRoot;

  var mock_app1 = {
    manifest: {
      name: 'testAppName1',
      developer: {
        name: 'testDeveloperName',
        url: 'testDeveloperUrl'
      },
      icons: null
    },
    removable: true,
    manifestURL: 'testManifestURL',
    origin: 'app://testOrigin1'
  };

  var mock_app2 = {
    manifest: {
      // When we execute _sortApps, mock_app2 will be placed in front of
      // mock_app1.
      name: 'atestAppName2',
      developer: {
        name: 'testDeveloperName',
        url: 'testDeveloperUrl'
      },
      type: 'certified',
      icons: {
        30: 'http://test30',
        60: 'http://test60'
      }
    },
    removable: true,
    manifestURL: 'testManifestURL',
    origin: 'app://testOrigin2'
  };

  var mock_permissionsTable = {
    permissionsTable: ['testApp'],
    composedPermissions: ['testComposedPermissions'],
    accessModes: ['read', 'write', 'create'],
    plainPermissions: ['testApp']
  };

  setup(function(done) {
    // We have to make listRoot clean every round
    mock_listRoot = {
      children: [],
      appendChild: function(item) {
        this.children.push(item);
      }
    };

    testRequire(modules, maps, function(MockAppsCache, MockMozApps,
      PermissionListModule) {
        mockAppsCache = MockAppsCache;
        mockMozApps = MockMozApps;
        permissionList = PermissionListModule();
        done();
    });
  });

  suite('Start test appPermissionList module', function() {
    setup(function() {
      this.sinon.stub(mockMozApps, 'getSelf', function() {
        return Promise.resolve(mock_app2);
      });

      MockPermissionSettings.set('testComposedPermissions-read', true);
      mockAppsCache._apps = [mock_app1, mock_app2];

      permissionList.init(mock_listRoot);
      permissionList.setPermissionsTable(mock_permissionsTable);
      permissionList._permissionTableHaveProcessed = false;
    });

    test('the app list content when push mock_app1 to permission list',
      function(done) {
        permissionList.refresh().then(function() {
          var list = permissionList._listRoot.children[0];
          var deviceRatio = window.devicePixelRatio || 1;
          var choosedIcon = deviceRatio * 30;

          assert.equal(list.querySelector('li:nth-child(1) a')
            .dataset.appIndex, 0, 'the appIndex of first app should be 0');

          assert.equal(list.querySelector('li:nth-child(1) img').src,
            mock_app2.manifest.icons[choosedIcon] + '/',
            'should show the icon from app manifest if it has');

          assert.equal(
            list.querySelector('li:nth-child(2) a').dataset.appIndex, 1);

          assert.include(list.querySelector('li:nth-child(2) img').src,
            'test/style/images/default.png',
            'should show default icon if it is not defined in its manifest');

          assert.equal(permissionList._permissionTableHaveProcessed, true);
        }, function() {
          // This line should not be rejected
          assert.isTrue(false);
        }).then(done, done);
    });
  });

  suite('_onApplicationInstall', function() {
    setup(function() {
      permissionList.init(mock_listRoot);
      permissionList._apps = [];
      permissionList._onApplicationInstall({
        application: mock_app1
      });
    });

    test('will render the images right', function() {
      var list = permissionList._listRoot.children[0];
      assert.include(list.querySelector('li:nth-child(1) img').src,
        'test/style/images/default.png',
        'should display info of mock_app1 after we install it');
    });
  });

  suite('_onApplicationUninstall', function() {
    setup(function() {
      permissionList.init(mock_listRoot);
      permissionList._apps = [mock_app1, mock_app2];
      permissionList._onApplicationUninstall({
        application: {
          origin: mock_app2.origin
        }
      });
    });

    test('will render the images right', function() {
      var list = permissionList._listRoot.children[0];
      assert.equal(list.querySelector('li:nth-child(1) a').dataset.appIndex, 0);
      assert.include(list.querySelector('li:nth-child(1) img').src,
        'test/style/images/default.png',
        'should display info of mock_app1 when we remove mock_app2');
    });
  });
});
