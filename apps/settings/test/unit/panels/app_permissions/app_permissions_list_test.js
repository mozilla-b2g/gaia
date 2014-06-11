'use strict';
/* global MockLock, MockMozApps, MockPermissionSettings */
suite('app permission list > ', function() {
  var PermissionList;

  var mock_elements = {
    dialog: {
      hidden: false
    },
    list: {
      children: [],
      appendChild: function(item) {
        this.children.push(item);
      }
    },
    mainButton: {
      hidden: false
    }
  };

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
    origin: 'testOrigin1'
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
    origin: 'testOrigin2'
  };

  var mock_permissionsTable = {
    permissionsTable: ['testApp'],
    composedPermissions: ['testComposedPermissions'],
    accessModes: ['read', 'write', 'create'],
    plainPermissions: ['testApp']
  };

  suiteSetup(function(done) {
    var modules = [
      'panels/app_permissions_list/app_permissions_list'
    ];
    var maps = {
      'panels/app_permissions_list/app_permissions_list': {
        'shared/manifest_helper': 'shared_mocks/mock_manifest_helper',
        'modules/settings_service': 'unit/mock_settings_service',
        'shared/settings_listener': 'shared_mocks/mock_settings_listener',
        'modules/navigator/mozApps': 'unit/mock_moz_apps',
        'modules/navigator/mozPermissionSettings':
          'shared_mocks/mock_permission_settings'
      }
    };
    testRequire(modules, maps,
      function(PermissionListModule) {
        PermissionList = PermissionListModule;
        done();
    });
  });

  suite('Start test appPermissionList module', function() {
    var permissionList;
    setup(function() {
      MockMozApps.mAddToCurrentApp(mock_app2);
      permissionList = PermissionList();
      permissionList.init(mock_elements);
      permissionList.setPermissionsTable(mock_permissionsTable);
      permissionList._permissionTableHaveProcessed = false;
      permissionList.refresh();
    });

    teardown(function() {
      permissionList._elements.list.children.length = 0;
    });

    test('the app list content when push mock_app1 to permission list',
      function() {
        permissionList._apps.push(mock_app1);
        MockPermissionSettings.set('testComposedPermissions-read', true);
        MockMozApps.mTriggerGetCurrentAppCallback();
        MockMozApps.mTriggerGetAllAppsCallback();

        var list = permissionList._elements.list.children[0];

        assert.equal(list.querySelector('li:nth-child(1) a')
          .dataset.appIndex, 0, 'the appIndex of first app should be 0');
        assert.equal(list.querySelector('li:nth-child(1) img').src,
          mock_app2.manifest.icons[30] + '/',
          'should show the icon from app manifest if it has');

        assert.equal(list.querySelector('li:nth-child(2) a').dataset.appIndex,
          1);
        assert.equal(list.querySelector('li:nth-child(2) img').src,
          'http://settings.gaiamobile.org:8080/test/style/images/default.png',
          'should show default icon if it is not defined in its manifest');

        assert.equal(permissionList._permissionTableHaveProcessed, true);
    });

    test('confirmGoClicked', function() {
      permissionList.confirmGoClicked();
      assert.equal(permissionList._elements.dialog.hidden, true,
        'should hide the dialog if user click confirm button');
      assert.deepEqual(MockLock.locks[0], {
        'clear.remote-windows.data': true
      }, 'should set the clear.remote-windows.data as true in settingsLock');
    });

    test('confirmCancelClicked', function() {
      permissionList.confirmCancelClicked();
      assert.equal(permissionList._elements.dialog.hidden, true,
        'should hide the dialog if user click cancel button');
    });

    test('onApplicationInstall', function() {
      permissionList.onApplicationInstall({
        application: mock_app1
      });

      var list = permissionList._elements.list.children[0];
      assert.equal(list.querySelector('li:nth-child(1) img').src,
        'http://settings.gaiamobile.org:8080/test/style/images/default.png',
        'should display info of mock_app1 after we install it');
    });

    test('onApplicationUninstall', function() {
      permissionList._apps = [mock_app1, mock_app2];
      permissionList.onApplicationUninstall({
        application: {
          origin: mock_app2.origin
        }
      });

      var list = permissionList._elements.list.children[0];
      assert.equal(list.querySelector('li:nth-child(1) a').dataset.appIndex, 0);
      assert.equal(list.querySelector('li:nth-child(1) img').src,
        'http://settings.gaiamobile.org:8080/test/style/images/default.png',
        'should display info of mock_app1 when we remove mock_app2');
    });
  });
});
