'use strict';

mocha.globals(['SettingsListener', 'removeEventListener', 'addEventListener',
      'dispatchEvent', 'Applications', 'ManifestHelper',
      'KeyboardManager', 'StatusBar', 'BrowserMixin', 'Template',
      'SoftwareButtonManager', 'AppWindow', 'LockScreenWindow', 'LockScreen',
      'OrientationManager', 'SettingsListener', 'BrowserFrame', 'lockScreen',
      'BrowserConfigHelper', 'System', 'AppTransitionController', 'stubById']);

requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/shared/js/template.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_screen_layout.js');

var mocksForLockScreenWindow = new window.MocksHelper([
  'OrientationManager', 'Applications', 'SettingsListener',
  'ManifestHelper', 'ScreenLayout'
]).init();

suite('system/LockScreenWindow', function() {
  var stubById;
  mocksForLockScreenWindow.attachTestHelpers();

  setup(function(done) {
    stubById = this.sinon.stub(document, 'getElementById', function(id) {
      // Must give a node with comment node for Template.
      if ('lockscreen-overlay-template' === id) {
        var node = document.createElement('div'),
            comment = document.createComment('<div id="lockscreen"></div>');
        node.appendChild(comment);
        return node;
      } else {
        return document.createElement('div');
      }
    });
    // Differs from the existing mock which is expected by other components.
    window.LockScreen = function() {};
    requireApp('system/js/system.js');
    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/browser_mixin.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/lockscreen_window.js', done);
  });

  teardown(function() {
    stubById.restore();
  });

  suite('Handle events', function() {
    test('Create lockscreen window would trigger events', function() {
      var stubDispatch = this.sinon.stub(window, 'dispatchEvent');
      var app = new window.LockScreenWindow();
      true === app; // To prevent lint complain usless var,
                    // which should actually fired event.
      assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
          function(e) {
            return 'lockscreen-appcreated' === e.type;
          })),
        'the event has not been fired');
    });

    test('Kill lockscreen window would trigger events', function() {
      var stubDispatch = this.sinon.stub(window, 'dispatchEvent'),
          app = new window.LockScreenWindow(),
          stubIsActive = this.sinon.stub(app, 'isActive'),
          parentElement = document.createElement('div');

      stubIsActive.returns(true);
      // Or the AppWindow would look for it.
      app.element = document.createElement('div');
      parentElement.appendChild(app.element);
      app.kill();
      assert.isTrue(stubDispatch.calledWithMatch(sinon.match(
          function(e) {
            return 'lockscreen-apprequestclose' === e.type;
          })),
        'the event has not been fired');
    });

    test('Terminated lockscreen window would trigger events', function() {
      var stubDispatch = this.sinon.stub(window, 'dispatchEvent'),
          app = new window.LockScreenWindow(),
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
            return 'lockscreen-appterminated' === e.type;
          })),
        'the event has not been fired');
    });

  });

  suite('Methods', function() {
    test('Create lockscreen window would render layout', function() {
      var app = new window.LockScreenWindow();
      assert.isNotNull(app.iframe,
        'the layout did\'t draw after window opened');
    });
  });
});
