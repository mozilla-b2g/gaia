'use strict';

requireApp('system/test/unit/mock_applications.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_screen_layout.js');

requireApp('system/js/home_gesture.js');
requireApp('system/js/software_button_manager.js');
var mocksForSftButtonManager = new MocksHelper([
  'SettingsListener',
  'ScreenLayout'
]).init();

suite('enable/disable software home button', function() {

  var realSettingsListener;
  var realScreenLayout;
  var realSettings;
  var fakeElement;
  var fakeHomeButton;
  var fakeFullScreenHomeButton;
  var fakeScreen;

  mocksForSftButtonManager.attachTestHelpers();

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
    fakeElement = document.createElement('div');
    fakeElement.id = 'software-buttons';
    fakeElement.height = '100px';
    document.body.appendChild(fakeElement);

    fakeHomeButton = document.createElement('div');
    fakeHomeButton.id = 'software-home-button';
    document.body.appendChild(fakeHomeButton);

    fakeScreen = document.createElement('div');
    fakeScreen.id = 'screen';
    document.body.appendChild(fakeScreen);

    fakeFullScreenHomeButton = document.createElement('div');
    fakeFullScreenHomeButton.id =
      'fullscreen-software-home-button';
    document.body.appendChild(fakeFullScreenHomeButton);
  });

  teardown(function() {
    fakeElement.parentNode.removeChild(fakeElement);
    fakeHomeButton.parentNode.removeChild(fakeHomeButton);
    fakeScreen.parentNode.removeChild(fakeScreen);
    fakeFullScreenHomeButton.parentNode
      .removeChild(fakeFullScreenHomeButton);
    window.ScreenLayout.mTeardown();
  });

  test('on real phone without hardware home button', function() {
    ScreenLayout.setDefault({
      tiny: true,
      isonrealdevice: true,
      hardwareHomeButton: false
    });
    SoftwareButtonManager.init();

    assert.equal(
      SoftwareButtonManager._enable, true);
    assert.equal(
      MockNavigatorSettings.
        mSettings['software-button.enabled'], true);
  });
  test('on tablet without hardware home button', function() {
    ScreenLayout.setDefault({
      tiny: false,
      isonrealdevice: true,
      hardwareHomeButton: false
    });
    SoftwareButtonManager.init();
    assert.equal(
      SoftwareButtonManager._enable, false);
    assert.equal(
      SoftwareButtonManager.element.classList.contains('visible'),
        false);
  });

  test('on real phone with hardware home button', function() {
    ScreenLayout.setDefault({
      tiny: true,
      isonrealdevice: true,
      hardwareHomeButton: true
    });
    SoftwareButtonManager.init();

    assert.equal(
      SoftwareButtonManager._enable, false);
    assert.equal(
      MockNavigatorSettings.
        mSettings['software-button.enabled'], true);
  });
  test('on real tablet with hardware home button', function() {
    ScreenLayout.setDefault({
      tiny: false,
      isonrealdevice: true,
      hardwareHomeButton: true
    });
    SoftwareButtonManager.init();

    assert.equal(
      SoftwareButtonManager._enable, false);
    assert.equal(
      SoftwareButtonManager.element.classList.contains('visible'),
        false);
  });

  test('pressing home button', function() {
    ScreenLayout.setDefault({
      tiny: true,
      hardwareHomeButton: true,
      isonrealdevice: true
    });
    var ready = false;
    SoftwareButtonManager.init();
    SoftwareButtonManager.element.
      addEventListener('softwareButtonEvent', function getMouseDown(evt) {
        SoftwareButtonManager.element.removeEventListener(
          'softwareButtonEvent', getMouseDown);
        if (evt.detail.type === 'home-button-press')
          ready = true;
      });
    SoftwareButtonManager.handleEvent({type: 'mousedown'});
    assert.isTrue(ready);
  });

  test('release home button', function() {
    ScreenLayout.setDefault({
      tiny: true,
      hardwareHomeButton: true,
      isonrealdevice: true
    });
    var ready = false;
    SoftwareButtonManager.init();
    SoftwareButtonManager.element.
      addEventListener('softwareButtonEvent', function getMouseDown(evt) {
        SoftwareButtonManager.element.removeEventListener(
          'softwareButtonEvent', getMouseDown);
        if (evt.detail.type === 'home-button-release')
          ready = true;
      });
    SoftwareButtonManager.handleEvent({type: 'mouseup'});
    assert.isTrue(ready);
  });

  test('receive homegesture-disabled when' +
       'software home button is also disabled', function() {
    ScreenLayout.setDefault({
      hardwareHomeButton: false
    });
    SoftwareButtonManager.init();
    SoftwareButtonManager._enable = false;
    SoftwareButtonManager.handleEvent(
      {type: 'homegesture-disabled'});
    assert.equal(
      MockNavigatorSettings.
        mSettings['software-button.enabled'], true);
  });

  test('receive homegesture-enabled when ' +
       'software home button is also enabled', function() {
    SoftwareButtonManager._enable = true;
    SoftwareButtonManager.handleEvent(
      {type: 'homegesture-enabled'});
    assert.equal(
      MockNavigatorSettings.
        mSettings['software-button.enabled'], false);
  });

  test('enable home gesture when software home button is enabled',
    function() {
    SoftwareButtonManager.init();
    SoftwareButtonManager._enable = true;
    HomeGesture.homeBar = {
      style: {
        display: 'none'
      }
    };
    HomeGesture.toggle(true);
    assert.equal(
      MockNavigatorSettings.
        mSettings['software-button.enabled'], false);
  });

  test('disable home gesture when software home button is disabled on tablet',
    function() {
    ScreenLayout.setDefault({
      hardwareHomeButton: false,
      tiny: false,
      isonrealdevice: true
    });
    SoftwareButtonManager.init();
    SoftwareButtonManager._enable = false;
    HomeGesture.homeBar = {
      style: {
        display: 'none'
      }
    };
    SoftwareButtonManager.OverrideFlag = false;
    HomeGesture.toggle(false);
    assert.equal(
      MockNavigatorSettings.
        mSettings['software-button.enabled'], true);
  });

});
