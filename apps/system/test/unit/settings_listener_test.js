'use strict';
/* global MockNavigatorSettings, SettingsListener */

requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/js/settings_listener.js');

suite('shared/SettingsListener', function() {
  var realSettings;
  var onChanged;
  var clock;

  setup(function() {
    realSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;
    onChanged = sinon.spy();
    clock = sinon.useFakeTimers();
  });

  teardown(function() {
    window.navigator.mozSettings.mTeardown();
    window.navigator.mozSettings = realSettings;
    clock.restore();
  });

  test('getSettingsLock', function() {
    var lock = SettingsListener.getSettingsLock();
    assert.isNotNull(lock);
    assert.isNotNull(lock.get());
  });

  test('observe', function() {
    var testKey = 'some.sample.key';
    SettingsListener.observe(testKey, 'old', onChanged);
    clock.tick(1);
    assert.isTrue(onChanged.calledWith('old'));
    onChanged.reset();
    MockNavigatorSettings.mTriggerObservers(testKey,
      {settingValue: 'new'});
    assert.isTrue(onChanged.calledWith('new'));
  });

  test('unobserve', function() {
    var testKey = 'some.sample.key';
    SettingsListener.observe(testKey, 'old', onChanged);
    clock.tick(1);
    MockNavigatorSettings.mTriggerObservers(testKey,
      {settingValue: 'new'});
    assert.isTrue(onChanged.called);
    onChanged.reset();
    SettingsListener.unobserve(testKey, onChanged);
    MockNavigatorSettings.mTriggerObservers(testKey,
      {settingValue: 'new'});
    assert.isFalse(onChanged.called);
  });
});
