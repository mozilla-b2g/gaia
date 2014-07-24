/* global MocksHelper, MockNavigatorSettings, MockSettingsHelper,
   IAC_API_WAKEUP_REASON_LOGIN, IAC_API_WAKEUP_REASON_LOGOUT,
   IAC_API_WAKEUP_REASON_STALE_REGISTRATION,
   IAC_API_WAKEUP_REASON_ENABLED_CHANGED
*/

'use strict';

require('/shared/test/unit/mocks/mocks_helper.js');
require('/shared/test/unit/mocks/mock_settings_helper.js');
require('/shared/test/unit/mocks/mock_dump.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/js/findmydevice_iac_api.js');

var mocksForFindMyDevice = new MocksHelper([
  'Dump', 'SettingsHelper'
]).init();

suite('FindMyDevice Launcher >', function(done) {
  var realMozSettings;

  mocksForFindMyDevice.attachTestHelpers();

  suiteSetup(function(done) {
    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    MockNavigatorSettings.mSetup();

    // We need to load this after setting up MockNavigatorSettings
    require('/js/findmydevice_launcher.js', function() {
      done();
    });
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    MockNavigatorSettings.mTeardown();
  });

  setup(function() {
    this.sinon.stub(window, 'wakeUpFindMyDevice');
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

  test('clear lockscreen message when the lockscreen unlocks', function() {
    window.dispatchEvent(new CustomEvent('lockscreen-appclosing'));
    assert.equal(
      MockSettingsHelper.instances['lockscreen.lock-message'].value, '');
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
});
