// Captive Portal Test

/* global CaptivePortal,
   FtuLauncher,
   MocksHelper,
   MockChromeEvent,
   MockL10n,
   MockMozActivity,
   MockNavigatorSettings,
   MockWifiManager,
   Notification,
   Promise
*/

'use strict';

requireApp('system/test/unit/mock_chrome_event.js');
requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mocks_helper.js');
require('/shared/test/unit/mocks/mock_l10n.js');
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
  var event;
  var successEvent;
  var abortEvent;
  var fakeScreenNode;
  var expectedBody, expectedTag;
  var notificationGetStub;
  var previousCaptiveNotification, previousSpy;

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

  setup(function(done) {
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

    var expectedSSID = window.navigator.mozWifiManager.connection.network.ssid;
    expectedTag = 'captivePortal:' + expectedSSID;
    expectedBody =
      'captive-wifi-available{"networkName":"' + expectedSSID + '"}';

    previousCaptiveNotification = new Notification('', {
      body: 'previousCaptiveNotification',
      tag: expectedTag
    });

    notificationGetStub = function notificationGet() {
      return Promise.resolve([previousCaptiveNotification]);
    };
    this.sinon.stub(window.Notification, 'get', notificationGetStub);
    previousSpy = this.sinon.spy(previousCaptiveNotification, 'close');

    CaptivePortal.init().then(function() {
      done();
    }, done);
  });

  test('system/captive portal notification cleanup', function() {
    sinon.assert.called(previousSpy);
  });

  test('system/captive portal login', function() {
    var sendSpy = this.sinon.stub(window, 'Notification').returns({
      addEventListener: function() {},
      close: function() {}
    });
    CaptivePortal.handleEvent(event);
    sinon.assert.called(sendSpy);
    var notification = sendSpy.firstCall.args[1];
    assert.equal(notification.body, expectedBody);
    assert.equal(notification.tag, expectedTag);
    assert.equal(notification.mozbehavior.showOnlyOnce, true);
  });

  test('system/captive portal open activity url', function() {
    var expectedActivity = {
      name: 'view',
      data: { type: 'url', url: event.detail.url }
    };
    var activitySpy = this.sinon.spy(window, 'MozActivity');
    CaptivePortal.handleEvent(event);
    CaptivePortal.captiveNotification_onClick();
    sinon.assert.calledWith(activitySpy, expectedActivity);
  });

  test('system/captive portal login success', function() {
    CaptivePortal.handleEvent(event);
    var closeSpy = this.sinon.spy(CaptivePortal.notification, 'close');
    CaptivePortal.handleEvent(successEvent);
    sinon.assert.called(closeSpy);
  });

  test('system/captive portal login again', function() {
    var sendSpy = this.sinon.stub(window, 'Notification').returns({
      addEventListener: function() {},
      close: function() {}
    });
    CaptivePortal.handleEvent(event);
    sinon.assert.called(sendSpy);
    var notification = sendSpy.firstCall.args[1];
    assert.equal(notification.body, expectedBody);
    assert.equal(notification.tag, expectedTag);
    assert.equal(notification.mozbehavior.showOnlyOnce, true);
  });

  test('system/captive portal login abort', function() {
    CaptivePortal.handleEvent(event);
    var closeSpy = this.sinon.spy(CaptivePortal.notification, 'close');
    CaptivePortal.handleEvent(abortEvent);
    sinon.assert.called(closeSpy);
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
