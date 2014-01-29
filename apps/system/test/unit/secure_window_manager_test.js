(function() {
'use strict';

mocha.globals(['SecureWindowManager', 'SecureWindowFactory', 'SecureWindow',
               'addEventListener', 'dispatchEvent', 'secureWindowManager']);

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
    // To prevent the original one has been
    // initialized in the bootstrap stage.
    window.secureWindowManager.suspendEvents();
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
          stubKill = this.sinon.stub(appFake, 'kill');
      window.secureWindowManager.handleEvent({type: 'secure-appcreated',
        detail: appFake});
      window.secureWindowManager.handleEvent({type: 'secure-closeapps'});
      assert.isTrue(stubKill.called,
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
      stubKill.restore();
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

    test('Suspend the secure mode', function() {
      window.secureWindowManager.handleEvent({type: 'secure-modeoff'});
      window.dispatchEvent(new CustomEvent('secure-appcreated',
          {detail: appFake}));
      assert.isNull(
        window.secureWindowManager.states.activeApp,
        'the app was got activated in off mode');
    });

    test('Resume the secure mode', function() {
      window.secureWindowManager.handleEvent({type: 'secure-modeoff'});
      window.dispatchEvent(new CustomEvent('secure-modeon'));
      window.dispatchEvent(new CustomEvent('secure-appcreated',
          {detail: appFake}));
      assert.isNotNull(
        window.secureWindowManager.states.activeApp,
        'the app was not got activated when the secure mode is on by event');
    });
  });
});

})();

