'use strict';

suite('addons manager test > ', function() {
  var realMozActivity;

  var mockAppsCache;
  var mockXMLHttpRequest;
  var mockMozApps;
  var mockMozActivity;
  var AddonManager;
  var MockApp;

  var modules = [
    'unit/mock_moz_apps',
    'shared_mocks/mock_moz_activity',
    'modules/addon_manager',
    'shared_mocks/mock_xml_http_request',
    'MockApp'
  ];

  var map = {
    'modules/addon_manager': {
      'modules/navigator/mozApps': 'unit/mock_moz_apps',
      'modules/apps_cache': 'unit/mock_apps_cache',
      'mdoules/app': 'MockApp'
    }
  };

  MockApp = function(app) {
    return {
      get enabled() {
        return app.enabled;
      },
      get instance() {
        return app;
      }
    };
  };

  // Check if an array of wrapped addons contains a specific un-wrapped addon.
  function containsAddon(wrappedAddons, addon) {
    return wrappedAddons.some((wrappedAddon) => {
      return wrappedAddon.instance === addon;
    });
  }

  var app1 = {
    manifest: {
      name: 'testAppName1',
    },
    manifestURL: 'testManifestURL_app1',
    origin: 'app://testorigin1'
  };

  var app2 = {
    manifest: {
      name: 'testAppName2',
    },
    manifestURL: 'testManifestURL_app2',
    origin: 'app://testorigin2'
  };

  var privilegedApp = {
    manifest: {
      type: 'privileged',
      name: 'privilegedAppName',
    },
    manifestURL: 'testManifestURL_priv_app',
    origin: 'app://privilegedorigin'
  };

  var certifiedApp = {
    manifest: {
      type: 'certified',
      role: 'system',
      name: 'certifiedAppName',
    },
    manifestURL: 'testManifestURL_cert_app',
    origin: 'app://certifiedorigin'
  };

  var settingsApp = {
    manifest: {
      type: 'certified',
      name: 'Settings',
      launch_path: '/index.html#',
    },
    manifestURL: 'testManifestURL_settings_app',
    origin: 'app://settings.gaiamobile.org'
  };

  var addon1 = {
    manifest: {
      role: 'addon',
      name: 'testAddonName1',
      // content_scripts field is internally copied from manifest.json to
      // manifest.webapp
      content_scripts: []
    },
    manifestURL: 'testManifestURL_addon1',
    origin: 'app://testaddonorigin1'
  };

  var addon2 = {
    manifest: {
      role: 'addon',
      name: 'testAddonName2',
      // content_scripts field is internally copied from manifest.json to
      // manifest.webapp
      content_scripts: [{
        matches: '<all_urls>',
        js: [],
        css: ['foo.css']
      }]
    },
    manifestURL: 'testManifestURL_addon2',
    origin: 'app://testaddonorigin2'
  };

  var obsoleteAddon = {
    manifest: {
      role: 'addon',
      name: 'obsoleteAddon',
      customizations: [{
        css: ['foo.css'],
        scripts: []
      }]
    },
    manifestURL: 'testManifestURL_obsoleteAddon',
    origin: 'app://testobsoleteaddonorigin'
  };

  var privilegedAddon = {
    manifest: {
      role: 'addon',
      type: 'privileged',
      name: 'privilegedAddonName',
      // content_scripts field is internally copied from manifest.json to
      // manifest.webapp
      content_scripts: [{
        matches: '<all_urls>',
        js: ['addon.js'],
        css: []
      }]
    },
    manifestURL: 'testManifestURL_priv_addon',
    origin: 'app://privilegedaddonorigin'
  };

  var certifiedAddon = {
    manifest: {
      role: 'addon',
      type: 'certified',
      name: 'certifiedAddonName',
      // content_scripts field is internally copied from manifest.json to
      // manifest.webapp
      content_scripts: [{
        matches: '<all_urls>',
        js: ['addon.js'],
        css: []
      }]
    },
    manifestURL: 'testManifestURL_cert_addon',
    origin: 'app://certifiedaddonorigin'
  };

  var settingsAddon = {
    manifest: {
      role: 'addon',
      type: 'certified',
      name: 'settingAddonName',
      content_scripts: [{
        matches: 'app://settings.gaiamobile.org/index.html*',
        js: [],
        css: []
      }]
    },
    manifestURL: 'testManifestURL_settings_addon',
    origin: 'app://settingsaddonorigin'
  };

  setup(function(done) {
    var requireCtx = testRequire(['unit/mock_apps_cache'], map,
      (MockAppsCache) => {
        mockAppsCache = MockAppsCache;
        mockAppsCache._apps = [
          app1, app2, addon1, addon2, obsoleteAddon,
          privilegedApp, privilegedAddon,
          certifiedApp, certifiedAddon,
          settingsApp, settingsAddon
        ];
        this.sinon.spy(mockAppsCache, 'addEventListener');
        this.sinon.spy(mockAppsCache, 'removeEventListener');

        define('MockApp', function() {
          return MockApp;
        });

        requireCtx(modules,
          (MockMozApps, MockMozActivity, _AddonManager, MockXMLHttpRequest) => {
            mockMozApps = MockMozApps;
            mockMozActivity = MockMozActivity;
            mockXMLHttpRequest = MockXMLHttpRequest;

            mockMozApps.mSetApps([
              app1, app2, addon1, addon2, obsoleteAddon,
              privilegedApp, privilegedAddon,
              certifiedApp, certifiedAddon,
              settingsApp, settingsAddon
            ]);

            this.sinon.spy(mockMozApps.mgmt, 'uninstall');
            this.sinon.spy(mockMozApps.mgmt, 'setEnabled');

            realMozActivity = window.MozActivity;
            window.MozActivity = window.MockMozActivity;
            window.MozActivity.mSetup();

            AddonManager = _AddonManager;
            done();
          });
    });
  });

  teardown(function() {
    window.MockMozActivity.mTeardown();
    window.MozActivity = realMozActivity;
  });

  test('AddonManager functions are all defined', function() {
    assert.isFunction(AddonManager.isEnabled);
    assert.isFunction(AddonManager.enableAddon);
    assert.isFunction(AddonManager.disableAddon);
    assert.isFunction(AddonManager.canDelete);
    assert.isFunction(AddonManager.deleteAddon);
    assert.isFunction(AddonManager.shareAddon);
    assert.isFunction(AddonManager.getAddonTargets);
  });

  suite('AddonManager.addons', function() {
    test('contains all the addons and no apps', function(done) {
      function doCheck() {
        var containsAll = [addon1, addon2, obsoleteAddon, privilegedAddon,
          certifiedAddon, settingsAddon].every(addon =>
            containsAddon(AddonManager.addons.array, addon));
        if (containsAll && AddonManager.length === 6) {
          done();
        }
      }

      if (doCheck()) {
        done();
      } else {
        AddonManager.addons.observe('insert', doCheck);
        AddonManager.addons.observe('remove', doCheck);
        AddonManager.addons.observe('reset', doCheck);
        AddonManager.addons.observe('replace', doCheck);
      }
    });
  });

  suite('_isAddon', function() {
    test('returns true for addons', function() {
      assert.isTrue(AddonManager._isAddon(addon1));
      assert.isTrue(AddonManager._isAddon(addon2));
      assert.isTrue(AddonManager._isAddon(certifiedAddon));
      assert.isTrue(AddonManager._isAddon(privilegedAddon));
      assert.isTrue(AddonManager._isAddon(settingsAddon));
    });

    test('returns false for non-addons', function() {
      assert.isFalse(AddonManager._isAddon(app1));
      assert.isFalse(AddonManager._isAddon(app2));
      assert.isFalse(AddonManager._isAddon(certifiedApp));
      assert.isFalse(AddonManager._isAddon(privilegedApp));
      assert.isFalse(AddonManager._isAddon(settingsApp));
    });
  });

  suite('_isEnabled', function() {
    test('only returns true for enabled addons', function() {
      var wrappedAddon = MockApp(addon1);
      var wrappedApp = MockApp(app1);

      addon1.enabled = true;
      assert.isTrue(AddonManager.isEnabled(wrappedAddon));

      addon1.enabled = false;
      assert.isFalse(AddonManager.isEnabled(wrappedAddon));

      delete addon1.enabled;
      assert.isFalse(AddonManager.isEnabled(wrappedAddon));

      app1.enabled = true;
      assert.isFalse(AddonManager.isEnabled(wrappedApp));
      delete app1.enabled;
    });
  });

  suite('_updateAddons', function() {
    test('add the new addon to addons from WebIDE', function() {
      // Installed with WebIDE, manifest exists
      var newAddon = {
        manifest: {
          role: 'addon',
          name: 'newAddon'
        },
        manifestURL: 'newAddonManifestURL',
        origin: 'app://newAddonManifestURL',
        addEventListener: function(evt, cb) {
          cb({
            type: evt,
            application: this
          });
        }
      };

      assert.isFalse(containsAddon(AddonManager.addons.array, newAddon));
      // Trigger an install event
      mockAppsCache.addEventListener.args.forEach(listener => {
        if (listener[0] === 'oninstall') {
          // evt for the callback function
          listener[1]({
            application: newAddon,
            type: 'install'
          });
        }
      });
      assert.isTrue(containsAddon(AddonManager.addons.array, newAddon));
    });

    test('add the new addon to addons from Marketplace', function() {
      // Installed with Marketplace, manifest does not exist yet
      var newAddon = {
        manifestURL: 'newAddonManifestURL',
        origin: 'app://newAddonManifestURL',
        addEventListener: function(evt, cb) {
          cb({
            type: evt,
            application: this
          });
        }
      };

      assert.isFalse(containsAddon(AddonManager.addons.array, newAddon));
      // Trigger an install event
      mockAppsCache.addEventListener.args.forEach(listener => {
        if (listener[0] === 'oninstall') {
          // evt for the callback function
          // Once downloadsuccess is fired, manifest would be available
          newAddon.manifest = {
            role: 'addon',
            name: 'newAddon'
          };
          listener[1]({
            application: newAddon,
            type: 'downloadsuccess'
          });
        }
      });
      assert.isTrue(containsAddon(AddonManager.addons.array, newAddon));
    });

    test('remove the addon from addons when "uninstall', function() {
      assert.isTrue(containsAddon(AddonManager.addons.array, addon1));
      // Trigger an uninstall event.
      mockAppsCache.addEventListener.args.forEach(listener => {
        if (listener[0] === 'onuninstall') {
          listener[1]({
            application: addon1,
            type: 'uninstall'
          });
        }
      });
      assert.isFalse(containsAddon(AddonManager.addons.array, addon1));
    });

    test('only add the same addon once', function() {
      assert.isTrue(containsAddon(AddonManager.addons.array, addon1));
      AddonManager._updateAddons({
        application: addon1,
        type: 'install'
      });
      assert.ok(AddonManager.addons.array.filter((addon) => {
        return addon.instance === addon1;
      }).length === 1);
    });
  });

  suite('_privilegeCheck', function() {
    test('should return correct result', function() {
      assert.isTrue(AddonManager._privilegeCheck(addon1, app1));
      assert.isFalse(AddonManager._privilegeCheck(addon1, privilegedApp));
      assert.isFalse(AddonManager._privilegeCheck(addon1, certifiedApp));

      assert.isTrue(AddonManager._privilegeCheck(privilegedAddon, app1));
      assert.isTrue(
        AddonManager._privilegeCheck(privilegedAddon, privilegedApp));
      assert.isTrue(
        AddonManager._privilegeCheck(privilegedAddon, certifiedApp));

      assert.isTrue(AddonManager._privilegeCheck(certifiedAddon, app1));
      assert.isTrue(
        AddonManager._privilegeCheck(certifiedAddon, privilegedApp));
      assert.isTrue(
        AddonManager._privilegeCheck(certifiedAddon, certifiedApp));
    });
  });

  suite('enableAddon', function() {
    test('does nothing for non-addons', function() {
      var wrappedApp = MockApp(app1);
      AddonManager.enableAddon(wrappedApp);
      assert.equal(mockMozApps.mgmt.setEnabled.callCount, 0);
    });

    test('calls setEnabled for addons', function() {
      var wrappedAddon = MockApp(addon1);
      app1.enabled = false;
      AddonManager.enableAddon(wrappedAddon);
      assert.isTrue(mockMozApps.mgmt.setEnabled.calledWith(addon1, true));
    });
  });

  suite('disableAddon', function() {
    test('does nothing for non-addons',
      function() {
        var wrappedApp = MockApp(app1);
        AddonManager.disableAddon(wrappedApp);
        assert.equal(mockMozApps.mgmt.setEnabled.callCount, 0);
    });

    test('synchronously calls setEnabled for addons', function() {
      var wrappedAddon = MockApp(addon1);
      addon1.enabled = true;
      AddonManager.disableAddon(wrappedAddon);
      assert.isTrue(mockMozApps.mgmt.setEnabled.calledWith(addon1, false));
    });
  });

  suite('canDelete', function() {
    test('only returns true for removable addons', function() {
      var wrappedAddon = MockApp(addon1);
      var wrappedApp = MockApp(app1);

      addon1.removable = true;
      assert.isTrue(AddonManager.canDelete(wrappedAddon));
      addon1.removable = false;
      assert.isFalse(AddonManager.canDelete(wrappedAddon));
      delete addon1.removable;
      assert.isFalse(AddonManager.canDelete(wrappedAddon));

      app1.removable = true;
      assert.isFalse(AddonManager.canDelete(wrappedApp));
      delete app1.removable;
    });
  });

  suite('deleteAddon', function() {
    test('rejects non-addons', function(done) {
      var wrappedApp = MockApp(app1);
      assert.isRejected(AddonManager.deleteAddon(wrappedApp)).notify(done);
    });

    test('rejects for non-removable addons', function(done) {
      var wrappedAddon = MockApp(addon1);
      addon1.removable = false;
      assert.isRejected(AddonManager.deleteAddon(wrappedAddon)).notify(done);
    });

    test('resolves for removable addons and calls uninstall', function(done) {
      var wrappedAddon = MockApp(addon1);
      addon1.removable = true;
      AddonManager.deleteAddon(wrappedAddon).then(function resolve() {
        assert.isTrue(mockMozApps.mgmt.uninstall.calledWith(addon1));
        done();
      }, function reject(error) {
        done(error);
      });
    });
  });

  suite('shareAddon', function() {
    test('rejects non-addons', function(done) {
      var wrappedApp = MockApp(app1);
      assert.isRejected(AddonManager.shareAddon(wrappedApp)).notify(done);
    });

    test('starts a share activity and resolves', function(done) {
      var wrappedAddon = MockApp(addon1);
      var promise = AddonManager.shareAddon(wrappedAddon);
      var activityRequest = window.MockMozActivity.calls.pop();
      assert.equal(activityRequest.name, 'share');
      assert.equal(activityRequest.data.type, 'app');
      assert.equal(activityRequest.data.app, addon1.manifestURL);

      assert.isFulfilled(promise).notify(done);
    });

    test('rejects if share activity fails', function(done) {
      var wrappedAddon = MockApp(addon1);
      var promise = AddonManager.shareAddon(wrappedAddon);
      window.MockMozActivity.mTriggerOnError();
      assert.isRejected(promise).notify(done);
    });
  });

  suite('getAddonTargets', function() {
    test('rejects non-addons', function(done) {
      var wrappedApp = MockApp(app1);
      assert.isRejected(AddonManager.getAddonTargets(wrappedApp)).notify(done);
    });

    test('returns no targets for obsolete addons',
      function(done) {
        var wrappedAddon = MockApp(obsoleteAddon);
        assert.becomes(AddonManager.getAddonTargets(wrappedAddon), [])
          .notify(done);
    });

    test('returns no targets for addons with no content scripts',
      function(done) {
        var wrappedAddon = MockApp(addon1);
        assert.becomes(AddonManager.getAddonTargets(wrappedAddon), [])
          .notify(done);
    });

    test('returns only unprivileged apps for unprivileged addons',
      function(done) {
        var wrappedAddon = MockApp(addon2);
        assert.becomes(AddonManager.getAddonTargets(wrappedAddon), [app1, app2])
          .notify(done);
    });

    test('does returns certified + privileged apps for privileged addons',
      function(done) {
        var wrappedAddon = MockApp(privilegedAddon);
        assert.becomes(AddonManager.getAddonTargets(wrappedAddon),
          [app1, app2, privilegedApp, certifiedApp, settingsApp]).notify(done);
    });

    test('returns any apps for certified addons', function(done) {
      var wrappedAddon = MockApp(certifiedAddon);
      assert.becomes(AddonManager.getAddonTargets(wrappedAddon),
        [app1, app2, privilegedApp, certifiedApp, settingsApp]).notify(done);
    });

    test('honors specific addon filters', function(done) {
      var wrappedAddon = MockApp(addon2);
      addon2.manifest.content_scripts[0].matches = 'app://testorigin1/';
      assert.becomes(AddonManager.getAddonTargets(wrappedAddon), [app1])
        .notify(done);
    });

    test('honors regexp addon filters', function(done) {
      var wrappedAddon = MockApp(addon2);
      addon2.manifest.content_scripts[0].matches = 'app://*/';
      assert.becomes(AddonManager.getAddonTargets(wrappedAddon), [app1, app2])
        .notify(done);
    });

    test('honors settings regexp addon filters', function(done) {
      var wrappedAddon = MockApp(settingsAddon);
      assert.becomes(AddonManager.getAddonTargets(wrappedAddon), [settingsApp])
        .notify(done);
    });

    test('does not return addons even explicitly targeted', function(done) {
      var wrappedAddon = MockApp(addon2);
      addon2.manifest.content_scripts[0].matches = 'app://testaddonorigin1/';
      assert.becomes(AddonManager.getAddonTargets(wrappedAddon), [])
        .notify(done);
    });
  });

  suite('getAddonDisableType', function() {
    test('resolves to an empty string if no targets', function(done) {
      var wrappedAddon = MockApp(addon1);
      assert.becomes(AddonManager.getAddonDisableType(wrappedAddon), '')
        .notify(done);
    });

    test('obsolete addon always resolves to an empty string if no targets',
      function(done) {
        var wrappedAddon = MockApp(obsoleteAddon);
        assert.becomes(AddonManager.getAddonDisableType(wrappedAddon), '')
          .notify(done);
      });

    test('resolves to an empty string if no scripts', function(done) {
      var wrappedAddon = MockApp(addon2);
      assert.becomes(AddonManager.getAddonDisableType(wrappedAddon), '')
        .notify(done);
    });

    test('resolves to "restart" if it injects scripts', function(done) {
      var wrappedAddon = MockApp(privilegedAddon);
      privilegedAddon.manifest.content_scripts[0].exclude_matches =
        'app://certifiedorigin/';
      assert.becomes(AddonManager.getAddonDisableType(wrappedAddon), 'restart')
        .notify(done);
    });

    test('resolves to "reboot" if addon injects into a system app',
      function(done) {
        var wrappedAddon = MockApp(certifiedAddon);
        assert.becomes(AddonManager.getAddonDisableType(wrappedAddon), 'reboot')
          .notify(done);
    });
  });

  suite('findAddonByManifestURL', function() {
    test('resolves to the correct addon object when matches', function(done) {
      var targetManifestURL = 'testManifestURL_priv_addon';
      var privAddon = AddonManager.addons.array.find((addon) => {
        return addon.instance.manifestURL === targetManifestURL;
      });

      assert.becomes(AddonManager
        .findAddonByManifestURL(targetManifestURL), privAddon).notify(done);
    });

    test('resolves to undefined when no addon matches', function(done) {
      assert.becomes(AddonManager
        .findAddonByManifestURL('fakeManifestURL'), undefined).notify(done);
    });
  });

  suite('addonAffectsApp', function() {
    test('resolves to true when an addon affects an app', function(done) {
      addon2.manifest.content_scripts[0].matches = 'app://testorigin1/';
      var wrappedAddon = MockApp(addon2);
      assert.becomes(AddonManager
        .addonAffectsApp(wrappedAddon, 'testManifestURL_app1'), true)
        .notify(done);
    });

    test('obsolete addon always resolves to false', function(done) {
      var wrappedAddon = MockApp(obsoleteAddon);
      assert.becomes(AddonManager
        .addonAffectsApp(wrappedAddon, 'testManifestURL_app1'), false)
        .notify(done);
    });

    test('resolves to false when an addon does not affect an app',
      function(done) {
        var wrappedAddon = MockApp(addon1);
        assert.becomes(AddonManager
          .addonAffectsApp(wrappedAddon, 'testManifestURL_app1'), false)
          .notify(done);
      });

    test('resolves to true when an addon match pattern matches an app',
      function(done) {
        var wrappedAddon = MockApp(settingsAddon);
        assert.becomes(AddonManager
          .addonAffectsApp(wrappedAddon, 'testManifestURL_settings_app'), true)
          .notify(done);
      });
  });
});
