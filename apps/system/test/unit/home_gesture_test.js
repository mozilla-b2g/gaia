'use strict';

requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_screen_layout.js');

requireApp('system/js/home_gesture.js');

var mocksForHomegesture = new MocksHelper([
  'SettingsListener',
  'ScreenLayout'
]).init();


suite('enable/disable homegesture', function() {
  var realSettingsListener;
  var realScreenLayout;
  var realSettings;
  var fakeHomebar;
  mocksForHomegesture.attachTestHelpers();

  suiteSetup(function() {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;
    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;
    realScreenLayout = window.ScreenLayout;
    window.ScreenLayout = MockScreenLayout;
  });

  suiteTeardown(function() {
    window.SettingsListener = realSettingsListener;
    window.ScreenLayout = realScreenLayout;
    navigator.mozSettings = realSettings;
  });

  setup(function() {
    fakeHomebar = document.createElement('div');
    fakeHomebar.id = 'bottom-panel';
    document.body.appendChild(fakeHomebar);
    ScreenLayout.setDefault({
      hardwareHomeButton: false
    });
  });

  teardown(function() {
    fakeHomebar.parentNode.removeChild(fakeHomebar);
    window.ScreenLayout.mTeardown();
  });

  test('initial gesture without hardware homebtn on phone', function() {
    ScreenLayout.setDefault({
      tiny: true
    });
    HomeGesture.init();
    assert.equal(
      MockNavigatorSettings.mSettings['homegesture.enabled'], false);
  });

  test('initial gesture without hardware homebtn on tablet', function() {
    ScreenLayout.setDefault({
      tiny: false
    });
    HomeGesture.init();
    assert.equal(
      HomeGesture.homeBar.classList.contains('visible'),
      true);
  });

  test('enable software button when homegesture is enabled', function() {
    HomeGesture.enable = true;
    HomeGesture.handleEvent({
      type: 'software-button-enabled'
    });
    assert.equal(
      MockNavigatorSettings.mSettings['homegesture.enabled'], false);
  });

  test('disable sw btn when homegesture is disabled without hardware homebtn',
    function() {
    HomeGesture.enable = false;
    HomeGesture.hasHardwareHomeButton = false;
    HomeGesture.handleEvent({
      type: 'software-button-disabled'
    });
    assert.equal(
      MockNavigatorSettings.mSettings['homegesture.enabled'], true);
  });

  test('when utility tray display', function() {
    HomeGesture.handleEvent({
      type: 'utilitytrayshow'
    });
    assert.equal(
      HomeGesture.homeBar.classList.contains('visible'),
      false);
  });

  test('when utility tray hide', function() {
    HomeGesture.handleEvent({
      type: 'utilitytrayhide'
    });
    assert.equal(
      HomeGesture.homeBar.classList.contains('visible'),
      true);
  });

  test('when lockscreen is enabled', function() {
    HomeGesture.handleEvent({
      type: 'lock'
    });
    assert.equal(
      HomeGesture.homeBar.classList.contains('visible'),
      false);
  });

  test('when lockscreen is disabled', function() {
    HomeGesture.handleEvent({
      type: 'will-unlock'
    });
    assert.equal(
      HomeGesture.homeBar.classList.contains('visible'),
      true);
  });
});
