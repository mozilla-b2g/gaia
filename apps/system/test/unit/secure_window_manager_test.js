(function() {
'use strict';

requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/test/unit/mock_secure_window.js');
requireApp('system/test/unit/mock_secure_window_factory.js');
requireApp('system/js/secure_window_manager.js');

var mocksForSecureWindowManager = new window.MocksHelper([
  'SecureWindow', 'SecureWindowFactory'
]).init();

suite('system/SecureWindowManager', function() {
  mocksForSecureWindowManager.attachTestHelpers();
  var stubById, appFake,
      configFake = {
        url: 'app://www.fake/index.html',
        manifest: {
          type: 'certified'
        },
        manifestURL: 'app://wwww.fake/ManifestURL',
        origin: 'app://www.fake'
      };

  setup(function() {
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    appFake = new window.SecureWindow(configFake);
    window.secureWindowManager = new window.SecureWindowManager();
  });

  teardown(function() {
    stubById.restore();
  });

  suite('Handle events', function() {
    test('App created', function() {
      window.secureWindowManager.handleEvent({type: 'secure-appcreated',
        detail: appFake});
      assert.equal(
        window.secureWindowManager.states.activeApp.instanceID,
          appFake.instanceID,
        'the app was not activated');
        window.assert.isObject(window.secureWindowManager
          .states.runningApps[appFake.instanceID],
        'the app was not registered in the maanger');
    });

    test('App request close', function() {
      var stubClose = this.sinon.stub(appFake, 'close');
      window.secureWindowManager.handleEvent({type: 'secure-apprequestclose',
        detail: appFake});
      assert.isTrue(stubClose.called,
          'the app was not closed after it fired the request');
      stubClose.restore();
    });

    test('App terminated', function() {
      window.secureWindowManager.handleEvent({type: 'secure-appcreated',
        detail: appFake});
      window.secureWindowManager.handleEvent({type: 'secure-appterminated',
        detail: appFake});
      assert.isNull(
        window.secureWindowManager.states.activeApp,
        'the app was still activated');
      assert.isUndefined(window.secureWindowManager
          .states.runningApps[appFake.instanceID],
        'the app was still registered in the maanger');
    });

    test('Apps got closed', function() {
      var stubClose = this.sinon.stub(appFake, 'close'),
          stubSoftKill = this.sinon.stub(appFake, 'softKill');
      window.secureWindowManager.handleEvent({type: 'secure-appcreated',
        detail: appFake});
      window.secureWindowManager.handleEvent({type: 'secure-closeapps'});
      assert.isTrue(stubSoftKill.called,
          'the app was not killed');

      // Because the apps would send events to notifiy the requstclose in
      // the normal mode.
      window.secureWindowManager.handleEvent({type: 'secure-apprequestclose',
        detail: appFake});
      assert.isTrue(stubClose.called,
          'the app was not closed after it sent the request');

      // Because the apps would send events to notifiy the terminated in
      // the normal mode.
      window.secureWindowManager.handleEvent({type: 'secure-appterminated',
        detail: appFake});
      assert.equal(Object.keys(window.secureWindowManager.states.runningApps)
          .length,
        0,
        'killer missed some apps');
      assert.isNull(
        window.secureWindowManager.states.activeApp,
        'the app was still activated');
      assert.isUndefined(window.secureWindowManager
          .states.runningApps[appFake.instanceID],
        'the app was still registered in the maanger');

      stubClose.restore();
      stubSoftKill.restore();
    });

    test('Apps got killed', function() {
      var stubClose = this.sinon.stub(appFake, 'close'),
          stubKill = this.sinon.stub(appFake, 'kill');
      window.secureWindowManager.handleEvent({type: 'secure-appcreated',
        detail: appFake});
      window.secureWindowManager.handleEvent({type: 'secure-killapps'});
      assert.isTrue(stubKill.called,
          'the app was not killed');

      // Because the apps would send events to notifiy the requstclose in
      // the normal mode.
      window.secureWindowManager.handleEvent({type: 'secure-apprequestclose',
        detail: appFake});
      assert.isTrue(stubClose.calledWith(
          window.secureWindowManager.configs.killAnimation),
          'the app was not closed with the correct animation');

      // Because the apps would send events to notifiy the terminated in
      // the normal mode.
      window.secureWindowManager.handleEvent({type: 'secure-appterminated',
        detail: appFake});
      assert.equal(Object.keys(window.secureWindowManager.states.runningApps)
          .length,
        0,
        'killer missed some apps');
      assert.isFalse(window.secureWindowManager.states.killMode,
        'after killing the mode has not been reset as false');
      assert.isNull(
        window.secureWindowManager.states.activeApp,
        'the app was still activated');
      assert.isUndefined(window.secureWindowManager.states
          .runningApps[appFake.instanceID],
        'the app was still registered in the maanger');

      stubClose.restore();
      stubKill.restore();
    });

    test('Pressing home', function() {
      var evt = {
        type: 'home'
      };
      var stubSoftKillApps = this.sinon.stub(window.secureWindowManager,
        'softKillApps');
      window.secureWindowManager.registerApp(appFake);
      window.secureWindowManager.handleEvent(evt);

      assert.isTrue(stubSoftKillApps.called,
          'should shut down secure apps after pressing home');
    });
  });
});

})();

