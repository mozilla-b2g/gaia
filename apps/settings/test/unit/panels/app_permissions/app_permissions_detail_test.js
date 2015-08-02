/* global MockMozApps, MockPermissionSettings */
'use strict';
suite('app permission detail > ', function() {
  var mockConfirmDialog, realConfirmDialog;
  var PermissionDetail;

  var mock_elements = {
    detailTitle: {
      textContent: false
    },
    uninstallButton: {
      disabled: false
    },
    developerInfos: {
      hidden: false
    },
    developerHeader: {
      hidden: false
    },
    developerLink: {
      href: 'testDeveloperLink'
    },
    developerName: {
      textContent: 'testDeveloperName'
    },
    developerUrl: {
      textContent: 'testDeveloperLink'
    },
    list: {
      appendChild: function(item) {
        mock_elements.list.children.push(item);
      },
      children: [],
      innerHTML: 'listHTML'
    },
    header: {
      hidden: false
    }
  };

  var mockSelectEvent = {
    target: {
      dataset: {
        perm: 'testComposedPermissions'
      },
      fakeAttributes: {},
      setAttribute: function(attr, value) {
        this.fakeAttributes[attr] = value;
      },
      value: null
    }
  };

  var mock_app = {
    manifest: {
      name: 'testAppName',
      developer: {
        name: 'testDeveloperName',
        url: 'testDeveloperUrl'
      }
    },
    removable: true,
    manifestURL: 'testManifestURL',
    origin: 'testOrigin'
  };

  var mock_permissionsTable = {
    composedPermissions: ['testComposedPermissions'],
    accessModes: ['read', 'write', 'create'],
    plainPermissions: [
      'testPlainPermissions'
    ]
  };

  mockConfirmDialog = function(value) {
    return value;
  };

  suiteSetup(function(done) {
    var modules = [
      'panels/app_permissions_detail/app_permissions_detail'
    ];

    var maps = {
      'panels/app_permissions_detail/app_permissions_detail': {
        'shared/manifest_helper': 'shared_mocks/mock_manifest_helper',
        'modules/settings_service': 'unit/mock_settings_service',
        'modules/navigator/mozApps': 'unit/mock_moz_apps',
        'modules/navigator/mozPermissionSettings':
          'shared_mocks/mock_permission_settings'
      }
    };
    testRequire(modules, maps,
      function(PermissionDetailModule) {
        realConfirmDialog = window.confirm;
        window.confirm = mockConfirmDialog;

        PermissionDetail = PermissionDetailModule;

        done();
    });
  });

  suiteTeardown(function() {
    window.confirm = realConfirmDialog;
  });

  suite('Start test appPermissionDetail module', function() {
    var permissionDetail;
    var mock_perm_not_composed = 'testNotComposedPermission';
    setup(function() {
      MockPermissionSettings.set('testComposedPermissions-read', 'prompt');
      MockPermissionSettings.set('testPlainPermissions', 'allow');
      permissionDetail = PermissionDetail();
      permissionDetail.init(mock_elements, mock_permissionsTable);
    });

    teardown(function() {
      MockPermissionSettings.mTeardown();
    });

    test('selectValueChanged', function() {
      permissionDetail.showAppDetails(mock_app);
      mockSelectEvent.target.value = 'prompt';
      permissionDetail.selectValueChanged(mockSelectEvent);
      assert.equal(MockPermissionSettings.get('testComposedPermissions-read'),
       'prompt', 'should display prompt permission value from' +
       'mozPermissionSettings if user has selected');

      mockSelectEvent.target.dataset.perm = mock_perm_not_composed;
      mockSelectEvent.target.value = 'deny';
      permissionDetail.selectValueChanged(mockSelectEvent);
      assert.equal(MockPermissionSettings.get(mock_perm_not_composed),
       'deny', 'should be able to set not composed permission all to deny');
    });

    test('showAppDetails, test the content of detail dialog', function() {
      permissionDetail.showAppDetails(mock_app);

      var selectOption = mock_elements.list.children[0];
      var target = selectOption.querySelector('[selected="true"]');
      var selectItem = selectOption.querySelector('select');
      assert.equal(target.value, 'allow');
      assert.equal(selectItem.dataset.perm, 'testPlainPermissions');

      selectOption = mock_elements.list.children[1];
      target = selectOption.querySelector('[selected="true"]');
      selectItem = selectOption.querySelector('select');
      assert.equal(target.value, 'prompt');
      assert.equal(selectItem.dataset.perm, 'testComposedPermissions');

      assert.equal(permissionDetail._elements.detailTitle.textContent,
        mock_app.manifest.name);
      assert.equal(permissionDetail._elements.uninstallButton.disabled,
        !mock_app.removable);
      assert.equal(permissionDetail._elements.developerName.textContent,
        mock_app.manifest.developer.name);
      assert.equal(permissionDetail._elements.developerInfos.hidden,
        false);
      assert.equal(permissionDetail._elements.developerHeader.hidden,
        false);
      assert.equal(permissionDetail._elements.developerUrl.hidden,
        false);
      assert.equal(permissionDetail._elements.developerLink.href,
        mock_app.manifest.developer.url);
      assert.equal(permissionDetail._elements.developerUrl.textContent,
        mock_app.manifest.developer.url);
      assert.equal(permissionDetail._elements.header.hidden,
        false);

      mock_app.manifest.developer.url = null;
      permissionDetail.showAppDetails(mock_app);
      assert.equal(permissionDetail._elements.developerLink.href,
        undefined);
      assert.equal(permissionDetail._elements.developerUrl.hidden,
        true);

      delete mock_app.manifest.developer;
      permissionDetail.showAppDetails(mock_app);
      assert.equal(permissionDetail._elements.developerInfos.hidden,
        true);
      assert.equal(permissionDetail._elements.developerHeader.hidden,
        true);
    });

    test('uninstall', function() {
      MockMozApps.mSetApps([mock_app]);
      permissionDetail.showAppDetails(mock_app);
      permissionDetail.uninstall();
      assert.equal(MockMozApps.mApps.length, 0,
        'should have no memeber in mozAppList if we remove it.');
    });

    test('would go back to previous panel when uninstalled', function() {
      permissionDetail = PermissionDetail();
      this.sinon.stub(permissionDetail, 'back');
      permissionDetail.init(mock_elements, mock_permissionsTable);

      window.dispatchEvent(new CustomEvent('applicationuninstall'));
      assert.isTrue(permissionDetail.back.called);
    });
  });
});
