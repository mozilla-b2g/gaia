'use strict';

/**
 * Because SecureWindow is inherited from the AppWindow,
 * and most of cases are tested in AppWindow's test,
 * this file would only contain those different parts of SecureWindow.
 */

mocha.globals(['SettingsListener', 'removeEventListener', 'addEventListener',
      'dispatchEvent', 'Applications', 'ManifestHelper',
      'KeyboardManager', 'StatusBar', 'BrowserMixin',
      'SoftwareButtonManager', 'AppWindow', 'SecureWindow',
      'OrientationManager', 'SettingsListener', 'BrowserFrame',
      'BrowserConfigHelper', 'System', 'LayoutManager',
      'AppTransitionController', 'stubById']);

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_layout_manager.js');
requireApp('system/test/unit/mock_screen_layout.js');

var mocksForSecureWindowManager = new window.MocksHelper([
  'OrientationManager', 'Applications', 'SettingsListener',
  'ManifestHelper', 'LayoutManager',
  'ScreenLayout'
]).init();

suite('system/SecureWindow', function() {
  var stubById,
      fakeConfig = {
        url: 'app://www.fake/index.html',
        manifest: {
          type: 'certified'
        },
        manifestURL: 'app://wwww.fake/ManifestURL',
        origin: 'app://www.fake'
      };
  mocksForSecureWindowManager.attachTestHelpers();

  setup(function(done) {
    stubById = this.sinon.stub(document, 'getElementById');
    stubById.returns(document.createElement('div'));
    requireApp('system/js/system.js');
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/browser_mixin.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/secure_window.js', done);
  });

  teardown(function() {
    stubById.restore();
  });

  suite('Handle events', function() {
    test('Create secure app would trigger events', function() {
      var stubDispatch = this.sinon.stub(window, 'dispatchEvent');
      var app = new window.SecureWindow(fakeConfig);
      true === app; // To prevent lint complain usless var,
                    // which should actually fired event.
      assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
          function(e) {
            return 'secure-appcreated' === e.type;
          })),
        'the event has not been fired');
      stubDispatch.restore();
    });

    test('Kill secure app would trigger events', function() {
      var stubDispatch = this.sinon.stub(window, 'dispatchEvent'),
          app = new window.SecureWindow(fakeConfig),
          stubIsActive = this.sinon.stub(app, 'isActive'),
          parentElement = document.createElement('div');

      stubIsActive.returns(true);
      // Or the AppWindow would look for it.
      app.element = document.createElement('div');
      parentElement.appendChild(app.element);
      app.kill();
      assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
          function(e) {
            return 'secure-apprequestclose' === e.type;
          })),
        'the event has not been fired');
      stubDispatch.restore();
      stubIsActive.restore();
    });

    test('Terminated secure app would trigger events', function() {
      var stubDispatch = this.sinon.stub(window, 'dispatchEvent'),
          app = new window.SecureWindow(fakeConfig),
          stubIsActive = this.sinon.stub(app, 'isActive'),
          parentElement = document.createElement('div');

      stubIsActive.returns(true);
      // Or the AppWindow would look for it.
      app.element = document.createElement('div');
      parentElement.appendChild(app.element);
      app.kill();
      app.close();
      assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
          function(e) {
            return 'secure-appterminated' === e.type;
          })),
        'the event has not been fired');
      stubDispatch.restore();
      stubIsActive.restore();
    });
  });
});
