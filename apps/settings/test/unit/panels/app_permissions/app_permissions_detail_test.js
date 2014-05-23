/* global MockMozApps, MockPermissionSettings */
'use strict';
suite('app permission detail > ', function() {
  var mockL10n, realL10n;
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
    developerName: {
      textContent: 'testDeveloperName',
      dataset: {
        href: 'developerNameHref'
      }
    },
    developerLink: {
      href: 'testDeveloperLink',
      hidden: false,
      textContent: 'devloperText',
      dataset: {
        href: 'developerNameHref'
      }
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
    explicitCertifiedPermissions: [
      {
        explicitPermission: 'testComposedPermissions-read',
        permission: 'testComposedPermissions'
      }
    ]
  };

  mockConfirmDialog = function(value) {
    return value;
  };

  suiteSetup(function(done) {
    var modules = [
      'unit/mock_l10n',
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
      function(MockL10n, PermissionDetailModule) {
        mockL10n = MockL10n;
        realL10n = window.navigator.mozL10n;
        window.navigator.mozL10n = mockL10n;

        realConfirmDialog = window.confirm;
        window.confirm = mockConfirmDialog;

        PermissionDetail = PermissionDetailModule;

        done();
    });
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
    window.confirm = realConfirmDialog;
  });

  suite('Start test appPermissionDetail module', function() {
    var permissionDetail;
    var mock_perm_not_composed = 'testNotComposedPermission';
    setup(function() {
      MockPermissionSettings.set('testComposedPermissions-read', 'prompt');
      permissionDetail = PermissionDetail();
      permissionDetail.init(mock_elements, mock_permissionsTable);
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
      var selectOptions = mock_elements.list.children[0];
      var target = selectOptions.querySelector('[selected="true"]');
      assert.equal(target.value, 'prompt');
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
      assert.equal(permissionDetail._elements.developerLink.hidden,
        false);
      assert.equal(permissionDetail._elements.developerName.dataset.href,
        mock_app.manifest.developer.url);
      assert.equal(permissionDetail._elements.developerLink.href,
        mock_app.manifest.developer.url);
      assert.equal(permissionDetail._elements.developerLink.dataset.href,
        mock_app.manifest.developer.url);
      assert.equal(permissionDetail._elements.developerLink.textContent,
        mock_app.manifest.developer.url);
      assert.equal(permissionDetail._elements.header.hidden,
        false);

      mock_app.manifest.developer.url = null;
      permissionDetail.showAppDetails(mock_app);
      assert.equal(permissionDetail._elements.developerName.dataset.href,
        undefined);
      assert.equal(permissionDetail._elements.developerLink.href,
        undefined);
      assert.equal(permissionDetail._elements.developerLink.hidden,
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
  });
});
