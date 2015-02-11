'use strict';

suite('AddonManager > ', function() {
  //
  // These are the fake app and addon objects we'll be testing with
  //

  var app1 = {
    manifest: {
      name: 'testAppName1',
    },
    manifestURL: 'testManifestURL',
    origin: 'app://testorigin1'
  };

  var app2 = {
    manifest: {
      name: 'testAppName2',
    },
    manifestURL: 'testManifestURL',
    origin: 'app://testorigin2'
  };

  var privilegedApp = {
    manifest: {
      type: 'privileged',
      name: 'privilegedAppName',
    },
    manifestURL: 'testManifestURL',
    origin: 'app://privilegedorigin'
  };

  var certifiedApp = {
    manifest: {
      type: 'certified',
      role: 'system',
      name: 'certifiedAppName',
    },
    manifestURL: 'testManifestURL',
    origin: 'app://certifiedorigin'
  };

  var addon1 = {
    manifest: {
      role: 'addon',
      name: 'testAddonName1',
    },
    manifestURL: 'testManifestURL',
    origin: 'app://testaddonorigin1'
  };

  var addon2 = {
    manifest: {
      role: 'addon',
      name: 'testAddonName2',
      customizations: [{
        css: ['foo.css'],
        scripts: []
      }]
    },
    manifestURL: 'testManifestURL',
    origin: 'app://testaddonorigin2'
  };

  var privilegedAddon = {
    manifest: {
      role: 'addon',
      type: 'privileged',
      name: 'privilegedAddonName',
      customizations: [{
        css: [],
        scripts: ['addon.js']
      }]
    },
    manifestURL: 'testManifestURL',
    origin: 'app://privilegedaddonorigin'
  };

  var certifiedAddon = {
    manifest: {
      role: 'addon',
      type: 'certified',
      name: 'certifiedAddonName',
      customizations: [{
        css: [],
        scripts: ['addon.js']
      }]
    },
    manifestURL: 'testManifestURL',
    origin: 'app://certifiedaddonorigin'
  };

  //
  // The AddonManager module we're testing, and the mocks we need to test it
  // 
  var AddonManager;
  var mockMozApps;
  var mockAppsCache;
  var realMozActivity;


  setup(function(done) {
    testRequire([ 'unit/mock_moz_apps',
                  'unit/mock_apps_cache',
                  'shared_mocks/mock_moz_activity',
                  'modules/addon_manager' ],
                { 'modules/addon_manager':
                  {
                    'modules/navigator/mozApps': 'unit/mock_moz_apps',
                    'modules/apps_cache': 'unit/mock_apps_cache'
                  }
                },
                function(MockMozApps, MockAppsCache, MockMozActivity,
                         AddonManagerModule) {
                  mockMozApps = MockMozApps;
                  mockAppsCache = MockAppsCache;
                  AddonManager = AddonManagerModule;

                  mockAppsCache._apps = [
                    app1, app2, addon1, addon2,
                    privilegedApp, privilegedAddon,
                    certifiedApp, certifiedAddon
                  ];

                  mockMozApps.mSetApps([
                    app1, app2, addon1, addon2,
                    privilegedApp, privilegedAddon,
                    certifiedApp, certifiedAddon
                  ]);

                  sinon.spy(mockMozApps.mgmt, 'uninstall');
                  sinon.spy(mockMozApps.mgmt, 'setEnabled');

                  realMozActivity = window.MozActivity;
                  window.MozActivity = window.MockMozActivity;
                  window.MozActivity.mSetup();

                  done();
                });

  });

  teardown(function() {
    window.MockMozActivity.mTeardown();
    window.MozActivity = realMozActivity;
  });

  test('AddonManager functions are all defined', function() {
    assert.isFunction(AddonManager.getAddons);
    assert.isFunction(AddonManager.isAddon);
    assert.isFunction(AddonManager.isEnabled);
    assert.isFunction(AddonManager.enableAddon);
    assert.isFunction(AddonManager.disableAddon);
    assert.isFunction(AddonManager.canDelete);
    assert.isFunction(AddonManager.deleteAddon);
    assert.isFunction(AddonManager.shareAddon);
    assert.isFunction(AddonManager.getAddonTargets);
    assert.isFunction(AddonManager.addEventListener);
    assert.isFunction(AddonManager.removeEventListener);
  });

  test('getAddons() returns all the addons and no apps', function(done) {
    assert.becomes(AddonManager.getAddons(),
                   [addon1, addon2, privilegedAddon, certifiedAddon])
      .notify(done);
  });

  test('isAddon', function() {
    assert.isTrue(AddonManager.isAddon(addon1));
    assert.isTrue(AddonManager.isAddon(addon2));
    assert.isTrue(AddonManager.isAddon(certifiedAddon));
    assert.isTrue(AddonManager.isAddon(privilegedAddon));

    assert.isFalse(AddonManager.isAddon(app1));
    assert.isFalse(AddonManager.isAddon(app2));
    assert.isFalse(AddonManager.isAddon(certifiedApp));
    assert.isFalse(AddonManager.isAddon(privilegedApp));

  });

  test('isEnabled only returns true for enabled addons', function() {
    addon1.enabled = true;
    assert.isTrue(AddonManager.isEnabled(addon1));

    addon1.enabled = false;
    assert.isFalse(AddonManager.isEnabled(addon1));

    delete addon1.enabled;
    assert.isFalse(AddonManager.isEnabled(addon1));

    app1.enabled = true;
    assert.isFalse(AddonManager.isEnabled(app1));
    delete app1.enabled;
  });

  test('enableAddon does nothing for non-apps', function() {
    AddonManager.enableAddon(app1);
    assert.equal(mockMozApps.mgmt.setEnabled.callCount, 0);
    assert.notOk(app1.enabled);
  });

  test('enableAddon calls setEnabled for addons', function() {
    AddonManager.enableAddon(addon1);
    assert.isTrue(mockMozApps.mgmt.setEnabled.calledWith(addon1, true));
    assert.isTrue(addon1.enabled);
  });

  test('disableAddon rejects non-apps and does not call setEnabled',
       function(done) {
         var promise = AddonManager.disableAddon(app1);
         assert.equal(mockMozApps.mgmt.setEnabled.callCount, 0);
         assert.isRejected(promise).notify(done);
       });

  test('disableAddon synchronously calls setEnabled for addons', function() {
    addon1.enabled = true;
    AddonManager.disableAddon(addon1);
    assert.isTrue(mockMozApps.mgmt.setEnabled.calledWith(addon1, false));
    assert.isFalse(addon1.enabled);
  });

  test('disableAddon resolves to "disabled" if no targets', function(done) {
    assert.becomes(AddonManager.disableAddon(addon1), 'disabled').notify(done);
  });

  test('disableAddon resolves to "disabled" if no scripts', function(done) {
    assert.becomes(AddonManager.disableAddon(addon2), 'disabled').notify(done);
  });

  test('disableAddon resolves to "restart" if it injects scripts',
       function(done) {
         assert.becomes(AddonManager.disableAddon(privilegedAddon), 'restart')
           .notify(done);
       });

  test('disableAddon resolves to "reboot" if addon injects into a system app',
       function(done) {
         assert.becomes(AddonManager.disableAddon(certifiedAddon), 'reboot')
           .notify(done);
       });

  test('canDelete only returns true for removable addons', function() {
    addon1.removable = true;
    assert.isTrue(AddonManager.canDelete(addon1));
    addon1.removable = false;
    assert.isFalse(AddonManager.canDelete(addon1));
    delete addon1.removable;
    assert.isFalse(AddonManager.canDelete(addon1));

    app1.removable = true;
    assert.isFalse(AddonManager.canDelete(app1));
    delete app1.removable;
  });

  test('deleteAddon rejects non-addons', function(done) {
    assert.isRejected(AddonManager.deleteAddon(app1)).notify(done);
  });

  test('deleteAddon rejects for non-removable addons', function(done) {
    addon1.removable = false;
    assert.isRejected(AddonManager.deleteAddon(addon1)).notify(done);
  });

  test('deleteAddon resolves for removable addons and calls uninstall',
       function(done) {
         addon1.removable = true;
         AddonManager.deleteAddon(addon1).then(
           function resolve() {
             done(function() {
               assert.isTrue(mockMozApps.mgmt.uninstall.calledWith(addon1));
             });
           },
           function reject(error) {
             done(error);
           });
       });

  test('shareAddon rejects non-addons', function(done) {
    assert.isRejected(AddonManager.shareAddon(app1)).notify(done);
  });

  test('shareAddon starts a share activity and resolves', function(done) {
    var promise = AddonManager.shareAddon(addon1);
    var activityRequest = window.MockMozActivity.calls.pop();
    assert.equal(activityRequest.name, 'share');
    assert.equal(activityRequest.data.type, 'app');
    assert.equal(activityRequest.data.app, addon1.manifestURL);

    assert.isFulfilled(promise).notify(done);
  });

  test('shareAddon rejects if share activity fails', function(done) {
    var promise = AddonManager.shareAddon(addon1);
    window.MockMozActivity.mTriggerOnError();
    assert.isRejected(promise).notify(done);
  });

  test('getAddonTargets rejects non-addons', function(done) {
    assert.isRejected(AddonManager.getAddonTargets(app1)).notify(done);
  });

  test('getAddonTargets returns no targets for addons with no customizations',
       function(done) {
         assert.becomes(AddonManager.getAddonTargets(addon1), [])
           .notify(done);
       });

  test('getAddonTargets returns only unprivileged apps for unprivileged addons',
       function(done) {
         assert.becomes(AddonManager.getAddonTargets(addon2), [app1, app2])
           .notify(done);
       });

  test('getAddonTargets does not return certified apps for uncertified addons',
       function(done) {
         assert.becomes(AddonManager.getAddonTargets(privilegedAddon),
                        [app1, app2, privilegedApp])
           .notify(done);
       });

  test('getAddonTargets returns any apps for certified addons',
       function(done) {
         assert.becomes(AddonManager.getAddonTargets(certifiedAddon),
                        [app1, app2, privilegedApp, certifiedApp])
           .notify(done);
       });

  test('getAddonTargets honors specific addon filters',
       function(done) {
         addon2.manifest.customizations[0].filter = 'app://testorigin1';
         assert.becomes(AddonManager.getAddonTargets(addon2), [app1])
           .notify(done);
       });

  test('getAddonTargets honors regexp addon filters',
       function(done) {
         addon2.manifest.customizations[0].filter = 'testorigin[0-9]';
         assert.becomes(AddonManager.getAddonTargets(addon2), [app1, app2])
           .notify(done);
       });

  test('getAddonTargets does not return addons even explicitly targeted',
       function(done) {
         addon2.manifest.customizations[0].filter = 'app://testaddonorigin1';
         assert.becomes(AddonManager.getAddonTargets(addon2), [])
           .notify(done);
       });

  test('events handler registration and unregistration', function() {
    var spy = sinon.spy();
    // Register an event handler
    AddonManager.addEventListener('addonschanged', spy);

    // Verify that it is not called when non-addons are (un)installed
    mockAppsCache._triggerInstallListeners(app1);
    assert.isTrue(spy.notCalled);
    mockAppsCache._triggerUninstallListeners(app1);
    assert.isTrue(spy.notCalled);

    // Verify that it is called correctly when addons are installed
    mockAppsCache._triggerInstallListeners(addon1);
    assert.isTrue(spy.calledOnce);
    var event = spy.lastCall.args[0];
    assert.equal(event.type, 'oninstall');
    assert.equal(event.application, addon1);

    // Verify that it is called correctly when addons are uninstalled
    mockAppsCache._triggerUninstallListeners(addon1);
    assert.isTrue(spy.calledTwice);
    event = spy.lastCall.args[0];
    assert.equal(event.type, 'onuninstall');
    assert.equal(event.application, addon1);

    // Now unregister the listener
    AddonManager.removeEventListener('addonschanged', spy);

    // Verify that it is no longer called for either type of event
    mockAppsCache._triggerInstallListeners(addon1);
    assert.isTrue(spy.calledTwice);
    mockAppsCache._triggerUninstallListeners(addon1);
    assert.isTrue(spy.calledTwice);
  });

});
