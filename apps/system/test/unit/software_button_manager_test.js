'use strict';
/* global MocksHelper */
/* global MockLock */
/* global MockNavigatorSettings */
/* global MockScreenLayout */
/* global MockSettingsListener */
/* global MockOrientationManager */
/* global ScreenLayout */
/* global SoftwareButtonManager */

requireApp('system/test/unit/mock_applications.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_screen_layout.js');
requireApp('system/test/unit/mock_orientation_manager.js');

var mocksForSftButtonManager = new MocksHelper([
  'SettingsListener',
  'ScreenLayout',
  'OrientationManager'
]).init();

suite('enable/disable software home button', function() {

  var realSettingsListener;
  var realScreenLayout;
  var realSettings;
  var realOrientationManager;
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
    realOrientationManager = window.OrientationManager;
    window.OrientationManager = MockOrientationManager;
  });

  suiteTeardown(function() {
    window.SettingsListener = realSettingsListener;
    window.ScreenLayout = realScreenLayout;
    window.OrientationManager = realOrientationManager;
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
      addEventListener('softwareButtonEvent', function getTouchStart(evt) {
        subject.element.removeEventListener(
          'softwareButtonEvent', getTouchStart);
        if (evt.detail.type === 'home-button-press') {
          ready = true;
        }
      });
    subject.handleEvent({type: 'touchstart'});
    assert.isTrue(ready);
    assert.isTrue(subject.homeButton.classList.contains('active'));
    assert.isTrue(subject.fullscreenHomeButton.classList.contains('active'));
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
      addEventListener('softwareButtonEvent', function getTouchEnd(evt) {
        subject.element.removeEventListener(
          'softwareButtonEvent', getTouchEnd);
        if (evt.detail.type === 'home-button-release') {
          ready = true;
        }
      });
    subject.handleEvent({type: 'touchend'});
    assert.isTrue(ready);
    assert.isFalse(subject.homeButton.classList.contains('active'));
    assert.isFalse(subject.fullscreenHomeButton.classList.contains('active'));
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

  suite('Redispatched events support', function() {
    var pressSpy, releaseSpy;

    setup(function() {
      this.sinon.useFakeTimers();

      // Simulating the landscape software home button
      this.sinon.stub(subject.homeButton, 'getBoundingClientRect').returns({
        left: 430,
        right: 480,
        top: 135,
        bottom: 185
      });
      window.dispatchEvent(new CustomEvent('system-resize'));

      pressSpy = this.sinon.spy(subject, 'press');
      releaseSpy = this.sinon.spy(subject, 'release');
    });

    function redispatch(clock, type, x, y) {
      clock.tick();
      window.dispatchEvent(new CustomEvent('edge-touch-redispatch', {
        bubbles: true,
        detail: {
          type: type,
          changedTouches: [{
            pageX: x,
            pageY: y
          }],
          touches: [{
            pageX: x,
            pageY: y
          }]
        }
      }));
    }

    test('should ignore events outside of the button', function() {
      redispatch(this.sinon.clock, 'touchstart', 460, 10);
      redispatch(this.sinon.clock, 'touchmove', 460, 10);
      redispatch(this.sinon.clock, 'touchend', 460, 10);

      sinon.assert.notCalled(pressSpy);
      sinon.assert.notCalled(releaseSpy);
    });

    test('should press then release on tap', function() {
      redispatch(this.sinon.clock, 'touchstart', 460, 140);
      redispatch(this.sinon.clock, 'touchmove', 460, 140);
      redispatch(this.sinon.clock, 'touchend', 460, 140);

      sinon.assert.callOrder(pressSpy, releaseSpy);
    });

    test('should fuzz the button rect a bit', function() {
      redispatch(this.sinon.clock, 'touchstart', 428, 132);
      redispatch(this.sinon.clock, 'touchmove', 428, 132);
      redispatch(this.sinon.clock, 'touchend', 428, 132);

      sinon.assert.callOrder(pressSpy, releaseSpy);
    });

    test('should release when exiting the button while swiping', function() {
      redispatch(this.sinon.clock, 'touchstart', 460, 140);
      redispatch(this.sinon.clock, 'touchmove', 460, 240);
      redispatch(this.sinon.clock, 'touchend', 460, 240);

      sinon.assert.callOrder(pressSpy, releaseSpy);
    });
  });
});
