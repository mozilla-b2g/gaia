'use strict';

mocha.globals(['SoftwareButtonManager']);

requireApp('system/test/unit/mock_applications.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_screen_layout.js');

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

  setup(function(done) {
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

    requireApp('system/js/software_button_manager.js', done);
  });

  teardown(function() {
    fakeElement.parentNode.removeChild(fakeElement);
    fakeHomeButton.parentNode.removeChild(fakeHomeButton);
    fakeScreen.parentNode.removeChild(fakeScreen);
    fakeFullScreenHomeButton.parentNode
      .removeChild(fakeFullScreenHomeButton);
    window.ScreenLayout.mTeardown();
    MockNavigatorSettings.mTeardown();
  });

  suite('on real phone without hardware home button', function() {
    var fakeGet;

    setup(function() {
      ScreenLayout.setDefault({
        tiny: true,
        isonrealdevice: true,
        hardwareHomeButton: false
      });
      fakeGet = {
        result: {}
      };
      this.sinon.stub(MockLock, 'get').returns(fakeGet);
    });

    suite('when the home gesture is disabled', function() {
      setup(function() {
        fakeGet.result = {
          'homegesture.enabled': false
        };
      });

      test('should enable the software home button settings', function() {
        SoftwareButtonManager.init();
        fakeGet.onsuccess();

        assert.equal(
          MockNavigatorSettings.
            mSettings['software-button.enabled'], true);
      });
    });

    suite('when the home gesture is enabled', function() {
      setup(function() {
        fakeGet.result = {
          'homegesture.enabled': true
        };
      });

      test('should not enable the software home button settings', function() {
        SoftwareButtonManager.init();
        fakeGet.onsuccess();

        assert.equal(
          MockNavigatorSettings.
            mSettings['software-button.enabled'], false);
      });
    });
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
    assert.isUndefined(
      MockNavigatorSettings.
        mSettings['software-button.enabled']);
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
});
