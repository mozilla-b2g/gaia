/* global FMDNotificationsHandler,
          MocksHelper,
          MockL10n,
          MockMozActivity,
          MockNavigatormozSetMessageHandler,
          MockNavigatorSettings,
          MockNotifications,
          MockService,
          MockSettingsHelper,
          IAC_API_WAKEUP_REASON_LOGIN,
          IAC_API_WAKEUP_REASON_LOGOUT,
          IAC_API_WAKEUP_REASON_STALE_REGISTRATION,
          IAC_API_WAKEUP_REASON_ENABLED_CHANGED,
          IAC_API_WAKEUP_REASON_LOCKSCREEN_CLOSED,
          FMDInit
*/

'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/mocks/mock_moz_activity.js');
require('/shared/test/unit/mocks/mock_settings_helper.js');
require('/shared/test/unit/mocks/mock_dump.js');
require('/shared/test/unit/mocks/mock_l10n.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_set_message_handler.js');
require('/shared/test/unit/mocks/mock_notification.js');
require('/shared/test/unit/mocks/mock_service.js');
require('/shared/js/findmydevice_iac_api.js');

const FMD_RETRIES = 5;
const FMD_TAG = 'findmydevice.enable-failed';

var mocksForFindMyDevice = new MocksHelper([
  'Dump', 'Notification', 'SettingsHelper', 'MozActivity', 'Service'
]).init();

suite('FindMyDevice Launcher >', function() {
  var realMozSettings;
  var realMozL10n;
  var realMozSetMessageHandler;

  mocksForFindMyDevice.attachTestHelpers();

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
    realMozL10n = navigator.mozL10n;
    realMozSetMessageHandler = navigator.mozSetMessageHandler;

    navigator.mozSettings = MockNavigatorSettings;

    MockMozActivity.mSetup();

    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mSetup();

    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    navigator.mozL10n = realMozL10n;
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    MockNavigatorSettings.mTeardown();
    MockNavigatormozSetMessageHandler.mTeardown();
  });

  setup(function(done) {
    MockNavigatorSettings.mSetup();
    require('/js/findmydevice_launcher.js', (function() {
      FMDInit();
      this.sinon.stub(window, 'wakeUpFindMyDevice');
      done();
    }).bind(this));
  });

  teardown(function() {
    MockNavigatorSettings.mTeardown();
  });

  test('send ENABLED_CHANGED wakeup message when enabled', function() {
    MockNavigatorSettings.mTriggerObservers('findmydevice.enabled',
      {settingValue: true});
    sinon.assert.calledWith(window.wakeUpFindMyDevice,
      IAC_API_WAKEUP_REASON_ENABLED_CHANGED);
  });

  test('send ENABLED_CHANGED wakeup message when disabled', function() {
    MockNavigatorSettings.mTriggerObservers('findmydevice.enabled',
      {settingValue: false});
    sinon.assert.calledWith(window.wakeUpFindMyDevice,
      IAC_API_WAKEUP_REASON_ENABLED_CHANGED);
  });

  test('send STALE_REGISTRATION wakeup message when geolocation is enabled',
  function() {
    MockNavigatorSettings.mTriggerObservers('geolocation.enabled',
      {settingValue: true});
    sinon.assert.calledWith(window.wakeUpFindMyDevice,
      IAC_API_WAKEUP_REASON_STALE_REGISTRATION);
  });

  test('send STALE_REGISTRATION wakeup message when geolocation is disabled',
  function() {
    MockNavigatorSettings.mTriggerObservers('geolocation.enabled',
      {settingValue: false});
    sinon.assert.calledWith(window.wakeUpFindMyDevice,
      IAC_API_WAKEUP_REASON_STALE_REGISTRATION);
  });

  test('Notification appears only when FMD retry count >= limit', function() {
    var notificationSpy = this.sinon.spy(window, 'Notification');

    // try a retry count less than the limit
    MockNavigatorSettings.mTriggerObservers('findmydevice.retry-count',
      {settingValue: FMD_RETRIES - 1});
    sinon.assert.callCount(notificationSpy, 0);

    // equal to the limit
    MockNavigatorSettings.mTriggerObservers('findmydevice.retry-count',
      {settingValue: FMD_RETRIES});
    sinon.assert.callCount(notificationSpy, 1);

    // greater than the limit
    MockNavigatorSettings.mTriggerObservers('findmydevice.retry-count',
      {settingValue: FMD_RETRIES + 1});
    sinon.assert.callCount(notificationSpy, 2);

    assert.isTrue(notificationSpy.calledWithNew());
    assert.equal(notificationSpy.firstCall.args[0], 'unable-to-connect');

    var options = notificationSpy.firstCall.args[1];
    assert.equal(options.icon, 'style/find_my_device/images/findMyDevice.png');
    assert.equal(options.tag, FMD_TAG);
    assert.equal(options.data.systemMessageTarget, 'findmydevice');
  });

  test('MozActivity is issued if notification clicked', function() {
    MockNavigatorSettings.mTriggerObservers('findmydevice.retry-count',
      {settingValue: FMD_RETRIES});

    var activitySpy = this.sinon.spy(window, 'MozActivity');

    var expectedActivity = {
      name : 'configure',
      data : {
        target : 'device',
        section : 'findmydevice'
      }
    };

    var notification = MockNotifications.pop();
    notification.onclick();

    assert.isTrue(activitySpy.calledWithNew());
    sinon.assert.calledWith(activitySpy, expectedActivity);
  });

  test('FMD disabled if retry-count >= limit, notification tapped', function() {
    MockSettingsHelper('findmydevice.enabled').set(true);
    MockNavigatorSettings.mTriggerObservers('findmydevice.retry-count',
      {settingValue: FMD_RETRIES});

    MockSettingsHelper('findmydevice.enabled').get(
      function(val) {
        assert.equal(val, false, 'enabled should be false');
      });
  });

  test('clear lockscreen message when the lockscreen unlocks', function() {
    window.dispatchEvent(new CustomEvent('lockscreen-request-unlock'));
    assert.equal(
      MockSettingsHelper.instances['lockscreen.lock-message'].value, '');
  });

  test('fmd is awoken with LOCKSCREEN_CLOSED on lockscreen unlock', function() {
    window.dispatchEvent(new CustomEvent('lockscreen-request-unlock'));
    sinon.assert.calledWith(window.wakeUpFindMyDevice,
      IAC_API_WAKEUP_REASON_LOCKSCREEN_CLOSED);
  });

  test('fmd is not awoken with LOCKSCREEN_CLOSED on lockscreen camera launch',
    function() {
      window.dispatchEvent(
        new CustomEvent('lockscreen-request-unlock',
        {detail: {activity: {name: 'record'}}}));
      sinon.assert.notCalled(window.wakeUpFindMyDevice,
        IAC_API_WAKEUP_REASON_LOCKSCREEN_CLOSED);
    }
  );

  test('send LOGIN wakeup message on FxA login', function() {
    window.dispatchEvent(
      new CustomEvent('mozFxAccountsUnsolChromeEvent',
      {detail: {eventName: 'onlogin'}}));
    sinon.assert.calledWith(window.wakeUpFindMyDevice,
      IAC_API_WAKEUP_REASON_LOGIN);
  });

  test('send LOGIN wakeup message on FxA verified', function() {
    window.dispatchEvent(
      new CustomEvent('mozFxAccountsUnsolChromeEvent',
      {detail: {eventName: 'onverified'}}));
    sinon.assert.calledWith(window.wakeUpFindMyDevice,
      IAC_API_WAKEUP_REASON_LOGIN);
  });

  test('send LOGOUT wakeup message on FxA logout', function() {
    window.dispatchEvent(
      new CustomEvent('mozFxAccountsUnsolChromeEvent',
      {detail: {eventName: 'onlogout'}}));
    sinon.assert.calledWith(window.wakeUpFindMyDevice,
      IAC_API_WAKEUP_REASON_LOGOUT);
  });

  suite('System message notification', function() {
    var serviceSpy;

    var notification = {
      body: 'tap-to-check-settings',
      tag: FMD_TAG,
      data: {
        systemMessageTarget: 'screenshot'
      },
      close: function() {}
    };

    suite('start condition', function() {
      test('FMDInit() requests handleSystemMessageNotification service',
        function() {
          serviceSpy = this.sinon.spy(MockService, 'request');
          FMDInit();
          assert.isTrue(serviceSpy.calledOnce);
          assert.isTrue(serviceSpy.calledWith(
            'handleSystemMessageNotification', 'findmydevice',
            FMDNotificationsHandler));
        });
    });

    suite('handleSystemMessageNotification behavior', function() {
      test('calls FMDOpenSettings', function() {
        var FMDOpenSettingsSpy = this.sinon.spy(window, 'FMDOpenSettings');
        FMDNotificationsHandler.handleSystemMessageNotification(notification);
        assert.isTrue(FMDOpenSettingsSpy.calledOnce);
      });

      test('calls closeSystemMessageNotification',
        function() {
          var closeSpy = this.sinon.spy(FMDNotificationsHandler,
                                        'closeSystemMessageNotification');
          FMDNotificationsHandler.handleSystemMessageNotification(notification);
          assert.isTrue(closeSpy.calledOnce);
          assert.isTrue(closeSpy.calledWith(notification));
        });
    });

    suite('closeSystemMessageNotification behavior', function() {
      var notifCloseSpy, notificationGetStub;

      setup(function() {
        notifCloseSpy = this.sinon.spy(notification, 'close');
        notificationGetStub = function notificationGet() {
          return {
            then: function(cb) {
              cb && cb([ notification ]);
            }
          };
        };
        this.sinon.stub(window.Notification, 'get', notificationGetStub);
      });

      test('closes notification by tag', function() {
        FMDNotificationsHandler.closeSystemMessageNotification(notification);
        assert.isTrue(window.Notification.get.calledOnce);
        assert.isTrue(window.Notification.get.calledWith(
          { tag: notification.tag}));
        assert.isTrue(notifCloseSpy.calledOnce);
      });

      test('closes notification by body', function() {
        var tag = notification.tag;
        notification.tag = undefined;

        FMDNotificationsHandler.closeSystemMessageNotification(notification);
        assert.isTrue(window.Notification.get.calledOnce);
        assert.isTrue(window.Notification.get.calledWith(
          { tag: notification.tag}));
        assert.isTrue(notifCloseSpy.calledOnce);

        notification.tag = tag;
      });
    });
  });

});
