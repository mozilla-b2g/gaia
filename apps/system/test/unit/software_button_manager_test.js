'use strict';
/* global MocksHelper */
/* global MockLock */
/* global MockNavigatorSettings */
/* global MockScreenLayout */
/* global MockSettingsListener */
/* global ScreenLayout */
/* global SoftwareButtonManager */

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
  var subject;

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
        subject = new SoftwareButtonManager();
        subject.start();
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
        subject = new SoftwareButtonManager();
        subject.start();
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
    subject = new SoftwareButtonManager();
    subject.start();
    assert.equal(
      subject.enabled, false);
    assert.equal(
      subject.element.classList.contains('visible'),
        false);
  });

  test('on real phone with hardware home button', function() {
    ScreenLayout.setDefault({
      tiny: true,
      isonrealdevice: true,
      hardwareHomeButton: true
    });
    subject = new SoftwareButtonManager();
    subject.start();

    assert.equal(
      subject.enabled, false);
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
    subject = new SoftwareButtonManager();
    subject.start();

    assert.equal(
      subject.enabled, false);
    assert.equal(
      subject.element.classList.contains('visible'),
        false);
  });

  test('pressing home button', function() {
    ScreenLayout.setDefault({
      tiny: true,
      hardwareHomeButton: true,
      isonrealdevice: true
    });
    var ready = false;
    subject = new SoftwareButtonManager();
    subject.start();
    subject.element.
      addEventListener('softwareButtonEvent', function getMouseDown(evt) {
        subject.element.removeEventListener(
          'softwareButtonEvent', getMouseDown);
        if (evt.detail.type === 'home-button-press') {
          ready = true;
        }
      });
    subject.handleEvent({type: 'mousedown'});
    assert.isTrue(ready);
  });

  test('release home button', function() {
    ScreenLayout.setDefault({
      tiny: true,
      hardwareHomeButton: true,
      isonrealdevice: true
    });
    var ready = false;
    subject = new SoftwareButtonManager();
    subject.start();
    subject.element.
      addEventListener('softwareButtonEvent', function getMouseDown(evt) {
        subject.element.removeEventListener(
          'softwareButtonEvent', getMouseDown);
        if (evt.detail.type === 'home-button-release') {
          ready = true;
        }
      });
    subject.handleEvent({type: 'mouseup'});
    assert.isTrue(ready);
  });

  test('receive homegesture-disabled when' +
       'software home button is also disabled', function() {
    ScreenLayout.setDefault({
      hardwareHomeButton: false
    });
    subject = new SoftwareButtonManager();
    subject.start();
    subject.enabled = false;
    subject.handleEvent(
      {type: 'homegesture-disabled'});
    assert.equal(
      MockNavigatorSettings.
        mSettings['software-button.enabled'], true);
  });

  test('receive homegesture-enabled when ' +
       'software home button is also enabled', function() {
    subject.enabled = true;
    subject.handleEvent(
      {type: 'homegesture-enabled'});
    assert.equal(
      MockNavigatorSettings.
        mSettings['software-button.enabled'], false);
  });
});
