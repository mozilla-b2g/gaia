'use strict';
/* global MocksHelper */
/* global MockLock */
/* global MockNavigatorSettings */
/* global MockScreenLayout */
/* global MockSettingsListener */
/* global ScreenLayout */
/* global SoftwareButtonManager */
/* global MockService */

requireApp('system/test/unit/mock_applications.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');
requireApp('system/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('system/test/unit/mock_screen_layout.js');
requireApp('system/shared/test/unit/mocks/mock_service.js');

var mocksForSftButtonManager = new MocksHelper([
  'Service',
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
  var fakeFullScreenElement;
  var fakeFullScreenLayoutHomeButton;
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
    MockService.mockQueryWith('getTopMostWindow', null);
    MockService.mockQueryWith('fetchCurrentOrientation', 'portrait-primary');
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

    fakeFullScreenElement = document.createElement('div');
    fakeFullScreenElement.id = 'software-buttons-fullscreen-layout';
    fakeFullScreenElement.height = '100px';
    document.body.appendChild(fakeFullScreenElement);

    fakeFullScreenLayoutHomeButton = document.createElement('div');
    fakeFullScreenLayoutHomeButton.id =
      'fullscreen-layout-software-home-button';
    fakeFullScreenElement.appendChild(fakeFullScreenLayoutHomeButton);

    requireApp('system/js/software_button_manager.js', done);
  });

  teardown(function() {
    fakeElement.parentNode.removeChild(fakeElement);
    fakeHomeButton.parentNode.removeChild(fakeHomeButton);
    fakeScreen.parentNode.removeChild(fakeScreen);
    fakeFullScreenHomeButton.parentNode
      .removeChild(fakeFullScreenHomeButton);
    fakeFullScreenLayoutHomeButton.parentNode
      .removeChild(fakeFullScreenLayoutHomeButton);
    fakeFullScreenElement.parentNode.removeChild(fakeFullScreenElement);
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
    subject.homeButtons.forEach(function(b) {
      assert.isTrue(b.classList.contains('active'));
    });

    var mousedownEvt =
      { type: 'mousedown', preventDefault: this.sinon.stub() };
    subject.handleEvent(mousedownEvt);
    assert.isTrue(mousedownEvt.preventDefault.calledOnce);
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
    subject.homeButtons.forEach(function(b) {
      assert.isFalse(b.classList.contains('active'));
    });
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

  suite('resizeAndDispatchEvent', function() {
    var disabled = 'software-button-disabled';
    var enabled = 'software-button-enabled';

    test('removes the class an raises a disbled event', function(done) {
      window.addEventListener(disabled, function assertIt() {
        window.removeEventListener(disabled, assertIt);
        done();
      });
      subject.enabled = false;
      assert.isFalse(subject.element.classList.contains('visible'));
      assert.isTrue(subject.screenElement.classList.contains(disabled));
      assert.isFalse(subject.screenElement.classList.contains(enabled));
    });

    test('adds the class an raises a enabled event', function(done) {
      window.addEventListener(enabled, function assertIt() {
        window.removeEventListener(enabled, assertIt);
        done();
      });
      subject.enabled = true;
      subject.resizeAndDispatchEvent();
      assert.isTrue(subject.element.classList.contains('visible'));
      assert.isFalse(subject.screenElement.classList.contains(disabled));
      assert.isTrue(subject.screenElement.classList.contains(enabled));
    });
  });

  suite('Fullscreen layout support', function() {
    var realFullScreen;
    var realFullScreenElem;
    var elem;

    setup(function() {
      this.sinon.useFakeTimers();
      elem = subject.fullscreenLayoutElement;

      realFullScreen = document.mozFullScreen;
      realFullScreenElem = document.mozFullScreenElement;
      Object.defineProperty(document, 'mozFullScreen', {
        configurable: true,
        get: function() { return true; }
      });

      Object.defineProperty(document, 'mozFullScreenElement', {
        configurable: true,
        get: function() { return subject.screenElement; }
      });

      window.dispatchEvent(new CustomEvent('mozfullscreenchange'));
    });

    teardown(function() {
      Object.defineProperty(document, 'mozFullScreen', {
        configurable: true,
        get: function() { return realFullScreen; }
      });
      Object.defineProperty(document, 'mozFullScreenElement', {
        configurable: true,
        get: function() { return realFullScreenElem; }
      });
      window.dispatchEvent(new CustomEvent('mozfullscreenchange'));
    });

    function fakeTouchDispatch(type, target, xs, ys) {
      var touches = [];

      for (var i = 0; i < xs.length; i++) {
        var x = xs[i];
        var y = ys[i];
        var touch = document.createTouch(window, target, 42, x, y,
                                         x, y, x, y,
                                         0, 0, 0, 0);
        touches.push(touch);
      }
      var touchList = document.createTouchList(touches);

      var e = document.createEvent('TouchEvent');
      e.initTouchEvent(type, true, true,
                       null, null, false, false, false, false,
                       touchList, null, touchList);

      target.dispatchEvent(e);
      return e;
    }

    test('the button should be hidden at first', function() {
      assert.isTrue(elem.classList.contains('hidden'));
    });

    suite('on tap', function() {
      setup(function() {
        fakeTouchDispatch('touchstart', subject.screenElement, [42], [42]);
        this.sinon.clock.tick();
        fakeTouchDispatch('touchend', subject.screenElement, [42], [42]);
      });

      test('the button should be displayed', function() {
        assert.isFalse(elem.classList.contains('hidden'));
      });

      test('the button should hide after a timeout', function() {
        this.sinon.clock.tick(3000);
        assert.isTrue(elem.classList.contains('hidden'));
      });

      suite('taping a second time', function() {
        var addSpy;
        setup(function() {
          addSpy = this.sinon.spy(elem.classList, 'add');
          fakeTouchDispatch('touchstart', subject.screenElement, [42], [42]);
          this.sinon.clock.tick();
          fakeTouchDispatch('touchend', subject.screenElement, [42], [42]);
        });

        test('should hide the button after a tiny timeout', function() {
          assert.isFalse(elem.classList.contains('hidden'));
          this.sinon.clock.tick(100);
          assert.isTrue(elem.classList.contains('hidden'));
        });

        suite('if the fullscreen is canceled at the same time', function() {
          setup(function() {
            this.sinon.clock.tick();

            Object.defineProperty(document, 'mozFullScreenElement', {
              configurable: true,
              get: function() { return null; }
            });

            window.dispatchEvent(new CustomEvent('mozfullscreenchange'));
            this.sinon.clock.tick(100);
          });

          test('the hidden class should never be added to prevent a flash',
          function() {
            sinon.assert.notCalled(addSpy);
          });
        });
      });
    });

    suite('on swipe', function() {
      setup(function() {
        fakeTouchDispatch('touchstart', subject.screenElement, [42], [42]);
        this.sinon.clock.tick();
        fakeTouchDispatch('touchend', subject.screenElement, [142], [142]);
      });

      test('the button should not be displayed', function() {
        assert.isTrue(elem.classList.contains('hidden'));
      });
    });
  });

  suite('Redispatched events support', function() {
    var pressSpy, releaseSpy;

    setup(function() {
      this.sinon.useFakeTimers();

      // Simulating the landscape software home button
      this.sinon.stub(subject.homeButtons[0], 'getBoundingClientRect').returns({
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

  suite('handle attention window when locked', function() {
    setup(function() {
      subject.element.classList.remove('attention-lockscreen');
    });

    test('should hide the software button', function() {
      MockService.mockQueryWith('getTopMostWindow', {
        CLASS_NAME: 'LockScreenWindow'
      });
      subject.handleEvent({type: 'hierachychanged'});
      assert.isTrue(subject.element.classList.contains('attention-lockscreen'));
    });

    test('should show the software button', function() {
      MockService.mockQueryWith('getTopMostWindow', {
        CLASS_NAME: 'CallScreenWindow'
      });
      subject.handleEvent({type: 'hierachychanged'});
      assert.isFalse(subject.element.classList.
        contains('attention-lockscreen'));
    });
  });

  suite('general event handling', function() {
    test('should listen when enabled', function() {
      this.sinon.spy(MockService, 'query');
      subject.enabled = true;
      window.dispatchEvent(new CustomEvent('mozorientationchange'));
      assert.isTrue(
        MockService.query.calledWith('fetchCurrentOrientation'));
    });

    test('should not listen when disabled', function() {
      this.sinon.spy(MockService, 'query');
      subject.enabled = false;
      window.dispatchEvent(new CustomEvent('mozorientationchange'));
      assert.isFalse(
        MockService.query.calledWith('fetchCurrentOrientation'));
    });
  });
});
