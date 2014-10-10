/* global MocksHelper, MockL10n, MockNavigatorSettings, MockSettingsHelper,
   MockMozActivity, MockNotifications, MockNavigatormozSetMessageHandler,
   SettingsHelper, IAC_API_WAKEUP_REASON_LOGIN, IAC_API_WAKEUP_REASON_LOGOUT,
   IAC_API_WAKEUP_REASON_STALE_REGISTRATION,
   IAC_API_WAKEUP_REASON_ENABLED_CHANGED,
   IAC_API_WAKEUP_REASON_LOCKSCREEN_CLOSED
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
require('/shared/js/findmydevice_iac_api.js');

const FMD_RETRIES = 5;

var mocksForFindMyDevice = new MocksHelper([
  'Dump', 'Notification', 'SettingsHelper', 'MozActivity'
]).init();

suite('FindMyDevice Launcher >', function(done) {
  var realMozSettings;
  var realMozL10n;
  var realMozSetMessageHandler;

  mocksForFindMyDevice.attachTestHelpers();

  suiteSetup(function(done) {
    realMozSettings = navigator.mozSettings;
    realMozL10n = navigator.mozL10n;
    realMozSetMessageHandler = navigator.mozSetMessageHandler;

    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSetup();

    MockMozActivity.mSetup();

    navigator.mozSetMessageHandler = MockNavigatormozSetMessageHandler;
    MockNavigatormozSetMessageHandler.mSetup();

    navigator.mozL10n = MockL10n;

    SettingsHelper.mSetup();
    SettingsHelper('findmydevice.enabled').set(true);
    MockNavigatorSettings.mSettings['findmydevice.enabled'] = true;

    sinon.stub(window, 'wakeUpFindMyDevice');

    // We need to load this after setting up MockNavigatorSettings because
    // FMD launcher attaches mozSettings listeners as soon as it loads.
    // Bug 1078953 tracks refactoring the FMD launcher to an initializable
    // object.
    require('/js/findmydevice_launcher.js', function() {
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    navigator.mozL10n = realMozL10n;
    navigator.mozSetMessageHandler = realMozSetMessageHandler;
    MockNavigatorSettings.mTeardown();
    MockNavigatormozSetMessageHandler.mTeardown();
  });

  setup(function() {
    // enable FMD
    MockNavigatorSettings.mTriggerObservers('findmydevice.enabled',
      {settingValue: true});
    // enabling FMD will call the wakeUpFindMyDevice spy, so reset it
    window.wakeUpFindMyDevice.reset();
  });

  teardown(function() {
    // disable FMD to clear out listeners at end of each test
    MockNavigatorSettings.mTriggerObservers('findmydevice.enabled',
      {settingValue: false});
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
    SettingsHelper('lockscreen.lock-message')
      .set('initial lockscreen message');
    window.dispatchEvent(new CustomEvent('lockscreen-appclosed'));
    assert.equal(
      MockSettingsHelper.instances['lockscreen.lock-message'].value, '');
  });

  test('fmd is awoken with LOCKSCREEN_CLOSED on lockscreen unlock', function() {
    window.dispatchEvent(new CustomEvent('lockscreen-appclosed'));
    sinon.assert.calledWith(window.wakeUpFindMyDevice,
      IAC_API_WAKEUP_REASON_LOCKSCREEN_CLOSED);
  });

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

  // bug 1062558 - FMD should not wake up if it's disabled
  suite('When FMD is disabled > ', function() {
    setup(function() {
      // disabling FMD should detach all settings observers except
      // the observer of the 'findmydevice.enabled' setting
      MockNavigatorSettings.mTriggerObservers('findmydevice.enabled',
        {settingValue: false});
      // disabling FMD will trigger a call to this spy, so clear it
      window.wakeUpFindMyDevice.reset();
    });

    test('do not wake FMD app if the geolocation.enabled setting changes',
    function() {
      MockNavigatorSettings.mTriggerObservers('geolocation.enabled',
        {settingValue: true});
      MockNavigatorSettings.mTriggerObservers('geolocation.enabled',
        {settingValue: false});
      sinon.assert.notCalled(window.wakeUpFindMyDevice);
    });

    test('do not wake FMD app if the Firefox Accounts login status changes',
    function() {
      window.dispatchEvent(
        new CustomEvent('mozFxAccountsUnsolChromeEvent',
        {detail: {eventName: 'onlogin'}}));
      window.dispatchEvent(
        new CustomEvent('mozFxAccountsUnsolChromeEvent',
        {detail: {eventName: 'onverified'}}));
      window.dispatchEvent(
        new CustomEvent('mozFxAccountsUnsolChromeEvent',
        {detail: {eventName: 'onlogout'}}));
      sinon.assert.notCalled(window.wakeUpFindMyDevice);
    });

    test('do not wake FMD app when the lockscreen is unlocked', function() {
      window.dispatchEvent(new CustomEvent('lockscreen-appclosed'));
      sinon.assert.notCalled(window.wakeUpFindMyDevice);
    });
  });
});
