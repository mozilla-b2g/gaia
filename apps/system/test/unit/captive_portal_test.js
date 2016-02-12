// Captive Portal Test

/* global CaptivePortal,
   MockService,
   MocksHelper,
   MockChromeEvent,
   MockL10n,
   MockMozActivity,
   MockNavigatorSettings,
   MockWifiManager,
   Notification,
   MockNotificationHelper,
   Promise
*/

'use strict';

requireApp('system/test/unit/mock_chrome_event.js');
requireApp('system/test/unit/mock_app.js');
requireApp('system/test/unit/mocks_helper.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/shared/test/unit/mocks/mock_l20n.js');
require('/shared/test/unit/mocks/mock_notification_helper.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_wifi_manager.js');
requireApp('system/test/unit/mock_activity.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_lazy_loader.js');

requireApp('system/js/browser_frame.js');
requireApp('system/js/entry_sheet.js');
requireApp('system/js/captive_portal.js');

var mocksForCaptivePortal = new MocksHelper([
  'SettingsListener',
  'AppWindowManager',
  'Service',
  'LazyLoader'
]).init();

suite('captive portal > ', function() {
  var realWifiManager;
  var realL10n;
  var realSettings;
  var realActivity;
  var realNotificationHelper;
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
    realL10n = document.l10n;
    document.l10n = MockL10n;
    realNotificationHelper = window.NotificationHelper;
    window.NotificationHelper = MockNotificationHelper;
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
    document.l10n = realL10n;
    navigator.mozSettings = realSettings;
    window.NotificationHelper = realNotificationHelper;
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
    expectedBody = {
      id: 'captive-wifi-available',
      args: {
        networkName: expectedSSID
      }
    };

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
    var sendSpy = this.sinon.spy(window.NotificationHelper, 'send');
    CaptivePortal.handleEvent(event);
    sinon.assert.called(sendSpy);
    var notification = sendSpy.firstCall.args[1];
    assert.deepEqual(notification.bodyL10n, expectedBody);
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
    CaptivePortal.handleEvent(successEvent);
    sinon.assert.called(CaptivePortal.notification.close);
  });

  test('system/captive portal login again', function() {
    var sendSpy = this.sinon.spy(window.NotificationHelper, 'send');
    CaptivePortal.handleEvent(event);
    sinon.assert.called(sendSpy);
    var notification = sendSpy.firstCall.args[1];
    assert.deepEqual(notification.bodyL10n, expectedBody);
    assert.equal(notification.tag, expectedTag);
    assert.equal(notification.mozbehavior.showOnlyOnce, true);
  });

  test('system/captive portal login abort', function() {
    CaptivePortal.handleEvent(event);
    CaptivePortal.handleEvent(abortEvent);
    sinon.assert.called(CaptivePortal.notification.close);
  });

  test('system/captive portal while FTU running..', function() {
    MockService.mockQueryWith('isFtuRunning', true);

    CaptivePortal.handleEvent(event);
    assert.equal(CaptivePortal.hasOwnProperty('entrySheet'), true);
  });
});
