// Captive Portal Test

'use strict';

requireApp('system/test/unit/mock_chrome_event.js');
requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mocks_helper.js');
requireApp('system/test/unit/mock_l10n.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_wifi_manager.js');
requireApp('system/test/unit/mock_activity.js');
requireApp('system/test/unit/mock_app_window_manager.js');

requireApp('system/js/browser_frame.js');
requireApp('system/js/entry_sheet.js');
requireApp('system/js/captive_portal.js');
requireApp('system/js/ftu_launcher.js');

var mocksForCaptivePortal = new MocksHelper([
  'SettingsListener',
  'AppWindowManager'
]).init();

suite('captive portal > ', function() {
  var realWifiManager;
  var realL10n;
  var realSettings;
  var realActivity;
  var mocksHelper;
  var timeout = 10;
  var subject;
  var event;
  var successEvent;
  var abortEvent;
  var fakeScreenNode;

  mocksForCaptivePortal.attachTestHelpers();
  suiteSetup(function() {
    realWifiManager = navigator.mozWifiManager;
    navigator.mozWifiManager = MockWifiManager;
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
    try {
      realActivity = window.MozActivity;
    } catch (e) {
      console.log('Access MozActivity failed, passed realActivity assignment');
    }
    window.MozActivity = MockMozActivity;
    window.utilityTrayNotifications = {
      createNotification: function() {
        return document.createElement('div');
      }
    };

    fakeScreenNode = document.createElement('div');
    fakeScreenNode.id = 'screen';
    document.body.appendChild(fakeScreenNode);
  });

  suiteTeardown(function() {
    navigator.mozWifiManager = realWifiManager;
    try {
      window.MozActivity = realActivity;
    } catch (e) {
      console.log('Access MozActivity failed, passed MozActivity assignment');
    }
    navigator.mozL10n = realL10n;
    navigator.mozSettings = realSettings;
    document.body.appendChild(fakeScreenNode);
  });

  setup(function() {
    event = new MockChromeEvent({
      type: 'captive-portal-login',
      url: 'http://developer.mozilla.org',
      id: 0
    });

    successEvent = new MockChromeEvent({
      type: 'captive-portal-login-success',
      url: 'http://developer.mozilla.org',
      id: 0
    });

    abortEvent = new MockChromeEvent({
      type: 'captive-portal-login-abort',
      url: 'http://developer.mozilla.org',
      id: 0
    });

    CaptivePortal.init();
  });

  test('system/captive portal login', function() {
    var stubDispatch = this.sinon.stub(window, 'dispatchEvent', function(e) {
      if ('notification-add' === e.type) {
        e.detail.onsuccess(document.createElement('div'));
      }
    });
    CaptivePortal.handleEvent(event);
    assert.isTrue(stubDispatch.calledWithMatch(function(e) {
      return 'notification-add' === e.type;
    }));
  });

  test('system/captive portal login success', function() {
    var stubDispatch = this.sinon.stub(window, 'dispatchEvent', function(e) {
      if ('notification-add' === e.type) {
        e.detail.onsuccess(document.createElement('div'));
      }
    });

    // To satisify the test condition only.
    var notiParent = document.createElement('div');
    var notification = document.createElement('div');
    notiParent.appendChild(notification);
    CaptivePortal.notification = notification;
    CaptivePortal.handleEvent(successEvent);
    assert.isTrue(stubDispatch.calledWithMatch(function(e) {
      return 'notification-remove' === e.type;
    }));
  });

  test('system/captive portal login again', function() {
    var stubDispatch = this.sinon.stub(window, 'dispatchEvent', function(e) {
      if ('notification-add' === e.type) {
        e.detail.onsuccess(document.createElement('div'));
      }
    });

    // To satisify the test condition only.
    var notiParent = document.createElement('div');
    var notification = document.createElement('div');
    notiParent.appendChild(notification);
    CaptivePortal.notification = notification;
    CaptivePortal.handleEvent(event);
    assert.isTrue(stubDispatch.calledWithMatch(function(e) {
      return 'notification-add' === e.type;
    }));
  });

  test('system/captive portal login abort', function() {
    var stubDispatch = this.sinon.stub(window, 'dispatchEvent', function(e) {
      if ('notification-add' === e.type) {
        e.detail.onsuccess(document.createElement('div'));
      }
    });

    // To satisify the test condition only.
    var notiParent = document.createElement('div');
    var notification = document.createElement('div');
    notiParent.appendChild(notification);
    CaptivePortal.notification = notification;
    CaptivePortal.handleEvent(abortEvent);
    assert.isTrue(stubDispatch.calledWithMatch(function(e) {
      return 'notification-remove' === e.type;
    }));
  });

  test('system/captive portal while FTU running..', function() {
    FtuLauncher._isRunningFirstTime = true;

    CaptivePortal.handleEvent(event);
    assert.equal(CaptivePortal.hasOwnProperty('entrySheet'), true);
  });

  teardown(function() {
    FtuLauncher._isRunningFirstTime = false;
  });
});
