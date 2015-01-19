/* global LayoutManager, MockL10n, MockService */
'use strict';

requireApp('system/shared/js/tagged.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');
requireApp('system/shared/test/unit/mocks/mock_manifest_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/test/unit/mock_applications.js');
requireApp('system/test/unit/mock_layout_manager.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/test/unit/mock_screen_layout.js');

var mocksForLockScreenWindow = new window.MocksHelper([
  'Service', 'Applications', 'SettingsListener', 'LazyLoader',
  'ManifestHelper', 'ScreenLayout', 'LayoutManager'
]).init();

suite('system/LockScreenWindow', function() {
  var realL10n, stubById, stubLockScreenAgent;
  mocksForLockScreenWindow.attachTestHelpers();

  setup(function(done) {
    stubLockScreenAgent = function() {
      this.start = function() {};
    };
    window.LockScreenAgent = stubLockScreenAgent;
    stubById = this.sinon.stub(document, 'getElementById', function(id) {

      var element = document.createElement('div');

      if (id.indexOf('AppWindow') >= 0) {
        var container = document.createElement('div');
        container.className = 'browser-container';
        element.appendChild(container);
      } else {
        var iframe = document.createElement('div');
        document.body.appendChild(iframe);
        return iframe;
      }

      return element;
    });
    // Differs from the existing mock which is expected by other components.
    window.LockScreen = function() {};
    window.LockScreen.prototype.init = this.sinon.stub();
    window.lockScreenNotificationBuilder =
    window.lockScreenNotifications = {
      start: function() {}
    };
    window.LockScreenStateManager = function() {
      this.start = function() {};
    };
    window.layoutManager = new LayoutManager();
    window.layoutManager.start();

    realL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = MockL10n;

    requireApp('system/js/browser_config_helper.js');
    requireApp('system/js/browser_frame.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/browser_mixin.js');
    requireApp('system/js/app_window.js');
    requireApp('system/js/lockscreen_window.js', done);
  });

  teardown(function() {
    window.navigator.mozL10n = realL10n;
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

  test('Resize', function() {
    var originalLockScreenWindowManager = window.lockScreenWindowManager;
    var app = new window.LockScreenWindow();
    app.inputWindow = {
      isActive() { return false; }
    };
    var stubIsActive = this.sinon.stub(app, 'isActive');
    stubIsActive.returns(true);
    app.resize();
    assert.equal(app.height, app.layoutHeight());
    window.lockScreenWindowManager = originalLockScreenWindowManager;
  });

  test('lockOrientation', function() {
    var mockScreen = {
      mozLockOrientation: function() {
        return true;
      }
    };
    MockService.mockQueryWith('isOnRealDevice', true);
    this.sinon.stub(window, 'screen', mockScreen);
    var method = window.LockScreenWindow.prototype.lockOrientation;
    this.sinon.stub(window, 'clearInterval');
    var stubSetInterval = this.sinon.stub(window, 'setInterval', function() {
      return 1;
    });
    var mockThis = {
      orientationLockID: null
    };
    method.call(mockThis);
    method.call(mockThis);
    assert.isTrue(stubSetInterval.calledOnce);
    assert.isFalse(stubSetInterval.calledTwice);
  });
});
