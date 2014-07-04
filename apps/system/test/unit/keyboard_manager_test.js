/*global
  KeyboardManager, sinon, KeyboardHelper, MockKeyboardHelper,
  MocksHelper, TransitionEvent, MockNavigatorSettings */
'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_keyboard_helper.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/test/unit/mock_applications.js');
require('/test/unit/mock_homescreen_launcher.js');
require('/js/input_transition.js');
require('/js/keyboard_manager.js');

var mocksHelperForKeyboardManager = new MocksHelper([
    'SettingsListener',
    'KeyboardHelper',
    'LazyLoader',
    'Applications'
]).init();

suite('KeyboardManager', function() {
  var BLUR_CHANGE_DELAY = 100;

  function trigger(event, detail) {
    if (!detail) {
      detail = {};
    }
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, true, false, detail);
    window.dispatchEvent(evt);
  }

  function inputChangeEvent(inputType) {
    return new CustomEvent('mozChromeEvent', {
      detail: {
        type: 'inputmethod-contextchange',
        inputType: inputType
      }
    });
  }

  function simulateInputChangeEvent(inputType) {
    // we call the method directly because we can't send a direct event
    // because otherwise in this test, we'll have n mozChromeEvent listeners
    KeyboardManager.inputFocusChange(inputChangeEvent(inputType));
  }

  function setupHTML() {
    var rc = document.querySelector('#run-container');
    rc.innerHTML = '';

    rc.innerHTML += '<div id="keyboard-show-ime-list">' +
      '<div class="fake-notification"><div class="message tip"></div></div>' +
      '</div>';
    rc.innerHTML += '<div id="keyboards" class="hide">hoi</div>';
  }

  function dispatchEventForOpacity() {
    var transitionEnd = new TransitionEvent(
      'transitionend',
      {
        propertyName: 'opacity',
        elapsedTime: 0.2
      }
    );

    KeyboardManager.transitionManager.handleEvent(transitionEnd);
  }

  function dispatchEventForTransform() {
    var transitionEnd = new TransitionEvent(
      'transitionend',
      {
        propertyName: 'transform',
        elapsedTime: 0.4
      }
    );

    KeyboardManager.transitionManager.handleEvent(transitionEnd);
  }

  function dispatchTransitionEvents() {
    dispatchEventForOpacity();
    dispatchEventForTransform();
  }

  mocksHelperForKeyboardManager.attachTestHelpers();

  var realMozSettings = null;
  var realKeyboard = null;

  suiteSetup(function() {
    document.body.innerHTML += '<div id="run-container"></div>';
    navigator.mozSettings = MockNavigatorSettings;

    realKeyboard = window.navigator.mozInputMethod;
    window.navigator.mozInputMethod = {
      removeFocus: function() {}
    };
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
    window.navigator.mozInputMethod = realKeyboard;
  });

  setup(function() {
    // we use sinon's fake timers for all the tests so that the timeouts used in
    // the tested code in one test don't disturb the next test.
    this.sinon.useFakeTimers();

    setupHTML();

    KeyboardManager.init();
  });

  suite('Switching keyboard focus', function() {
    setup(function() {
      this.sinon.stub(KeyboardManager, 'hideKeyboard');
      this.sinon.stub(KeyboardManager, 'hideIMESwitcher');
      this.sinon.stub(KeyboardManager, 'showIMESwitcher');
      this.sinon.stub(KeyboardManager, 'setKeyboardToShow');
      this.sinon.stub(KeyboardManager, 'resetShowingKeyboard');
    });

    test('The event triggers inputFocusChange', function() {
      this.sinon.stub(KeyboardManager, 'inputFocusChange');

      var event = inputChangeEvent('text');
      window.dispatchEvent(event);

      sinon.assert.called(KeyboardManager.inputFocusChange);
    });

    suite('Switching inputType', function() {
      setup(function() {
        this.getLayouts = this.sinon.stub(KeyboardHelper, 'getLayouts');
        this.checkDefaults = this.sinon.stub(KeyboardHelper, 'checkDefaults');
        MockKeyboardHelper.watchCallback(KeyboardHelper.layouts,
          { apps: true });
      });
      test('Switching from "text" to "number"', function() {
        simulateInputChangeEvent('text');
        this.sinon.clock.tick(BLUR_CHANGE_DELAY);

        simulateInputChangeEvent('number');
        this.sinon.clock.tick(BLUR_CHANGE_DELAY);

        sinon.assert.calledWith(KeyboardManager.setKeyboardToShow, 'text');
        sinon.assert.calledWith(KeyboardManager.setKeyboardToShow, 'number');
        sinon.assert.callCount(KeyboardManager.resetShowingKeyboard, 0);
      });

      test('Switching from "text" to "text"', function() {
        simulateInputChangeEvent('text');
        this.sinon.clock.tick(BLUR_CHANGE_DELAY);
        simulateInputChangeEvent('text');
        this.sinon.clock.tick(BLUR_CHANGE_DELAY);

        sinon.assert.calledWith(KeyboardManager.setKeyboardToShow, 'text');
        sinon.assert.notCalled(KeyboardManager.resetShowingKeyboard);
      });

      test('Switching from "text" to "select-one"', function() {
        simulateInputChangeEvent('text');
        this.sinon.clock.tick(BLUR_CHANGE_DELAY);
        simulateInputChangeEvent('select-one');
        this.sinon.clock.tick(BLUR_CHANGE_DELAY);

        sinon.assert.called(KeyboardManager.hideKeyboard);
      });
    });

    suite('keyboard type "url" - has enabled layouts', function() {
      setup(function() {
        this.getLayouts = this.sinon.stub(KeyboardHelper, 'getLayouts');
        this.checkDefaults = this.sinon.stub(KeyboardHelper, 'checkDefaults');
        MockKeyboardHelper.watchCallback(KeyboardHelper.layouts,
          { apps: true });

        simulateInputChangeEvent('url');
        this.sinon.clock.tick(BLUR_CHANGE_DELAY);
      });
      test('does not request layouts or defaults', function() {
        assert.isFalse(this.getLayouts.called);
        assert.isFalse(this.checkDefaults.called);
      });
      test('shows "url" keyboard', function() {
        assert.ok(KeyboardManager.setKeyboardToShow.calledWith('url'));
      });
    });

    suite('keyboard type "url" - no enabled layout', function() {
      setup(function() {
        this.saveToSettings = this.sinon.stub(KeyboardHelper, 'saveToSettings');
        this.getLayouts = this.sinon.stub(KeyboardHelper, 'getLayouts');
        // make this respond automatically
        this.getLayouts.yields([]);

        // trigger no keyboards in the first place
        MockKeyboardHelper.watchCallback([], { apps: true, settings: true });
      });
      teardown(function() {
        MockKeyboardHelper.watchCallback(KeyboardHelper.layouts,
          { apps: true });
      });
      suite('no defaults enabled', function() {
        setup(function() {
          this.checkDefaults = this.sinon.stub(KeyboardHelper, 'checkDefaults');

          simulateInputChangeEvent('url');
          this.sinon.clock.tick(BLUR_CHANGE_DELAY);
        });

        test('requests layouts', function() {
          assert.ok(this.getLayouts.called);
        });
        test('requests defaults', function() {
          assert.ok(this.checkDefaults.calledAfter(this.getLayouts));
        });
        test('reverts to "text" when no defaults', function() {
          assert.ok(KeyboardManager.setKeyboardToShow.calledWith('text'));
        });
      });

      suite('defaults enabled', function() {
        setup(function() {
          this.checkDefaults = this.sinon.stub(KeyboardHelper, 'checkDefaults',
            function overrideCheckDefaults(callback) {
              this.getLayouts.yields([KeyboardHelper.layouts[0]]);
              callback();
            }.bind(this));
          simulateInputChangeEvent('url');
          this.sinon.clock.tick(BLUR_CHANGE_DELAY);
        });

        test('requests layouts', function() {
          assert.ok(this.getLayouts.called);
        });
        test('requests defaults', function() {
          assert.ok(this.checkDefaults.called);
        });
        test('requests layouts again', function() {
          assert.ok(this.getLayouts.calledAfter(this.checkDefaults));
        });
        test('saves', function() {
          assert.ok(this.saveToSettings.called);
        });
        test('keeps "url" when defaults found', function() {
          assert.ok(KeyboardManager.setKeyboardToShow.calledWith('url'));
        });
      });
    });
  });

  suite('Switching keyboard focus before keyboard is shown', function() {
    setup(function() {
      this.sinon.stub(KeyboardManager, 'resetShowingKeyboard');
    });

    test('Switching from "text" to another field before' +
         'the keyboard is shown.', function() {

      simulateInputChangeEvent('text');
      KeyboardManager.hideKeyboard();

      sinon.assert.callCount(KeyboardManager.resetShowingKeyboard, 1);
    });
  });

  suite('removeKeyboard test', function() {
    var fakeFrame_A, fakeFrame_B;
    setup(function() {
      fakeFrame_A = {
        manifestURL: 'app://keyboard.gaiamobile.org/manifest.webapp',
        id: 'en'};

      fakeFrame_B = {
        manifestURL: 'app://keyboard-test.gaiamobile.org/manifest.webapp',
        id: 'en'};
    });

    test('Not exist in runningLayouts', function() {
      KeyboardManager.runningLayouts[fakeFrame_A.manifestURL] = {};
      KeyboardManager.runningLayouts[fakeFrame_A.manifestURL][fakeFrame_A.id] =
                                                              this.sinon.stub;
      KeyboardManager.removeKeyboard(fakeFrame_B.manifestURL);
      assert.equal(
        KeyboardManager.runningLayouts.hasOwnProperty(fakeFrame_A.manifestURL),
        true);
    });

    test('Not in showingLayout', function() {
      var hideKeyboard = this.sinon.stub(KeyboardManager, 'hideKeyboard');
      KeyboardManager.runningLayouts[fakeFrame_B.manifestURL] = {};
      KeyboardManager.runningLayouts[fakeFrame_B.manifestURL][fakeFrame_B.id] =
                                                              this.sinon.stub;
      KeyboardManager.removeKeyboard(fakeFrame_B.manifestURL);
      sinon.assert.callCount(hideKeyboard, 0);
      assert.equal(
        KeyboardManager.runningLayouts.hasOwnProperty(fakeFrame_B.manifestURL),
        false);
    });

    test('In showingLayout', function() {
      var hideKeyboard = this.sinon.stub(KeyboardManager, 'hideKeyboard');
      var setKeyboardToShow =
                          this.sinon.stub(KeyboardManager, 'setKeyboardToShow');
      KeyboardManager.runningLayouts[fakeFrame_A.manifestURL] = {};
      KeyboardManager.runningLayouts[fakeFrame_A.manifestURL][fakeFrame_A.id] =
                                                              this.sinon.stub;
      var fakeFrame = document.createElement('div');
      fakeFrame.dataset.frameManifestURL =
        'app://keyboard.gaiamobile.org/manifest.webapp';

      KeyboardManager.showingLayout.frame = fakeFrame;
      KeyboardManager.showingLayout.type = 'text';
      KeyboardManager.removeKeyboard(fakeFrame_A.manifestURL, true);
      sinon.assert.callCount(hideKeyboard, 1);
      assert.ok(setKeyboardToShow.calledWith('text'));
      assert.equal(
        KeyboardManager.runningLayouts.hasOwnProperty(fakeFrame_A.manifestURL),
        false);
    });
  });

  suite('Event handler', function() {
    var handleResize, hideKeyboardImmediately, removeKeyboard, hideKeyboard;
    setup(function() {
      handleResize = this.sinon.stub(
        KeyboardManager.transitionManager, 'handleResize');
      hideKeyboard = this.sinon.stub(KeyboardManager, 'hideKeyboard');
      hideKeyboardImmediately =
            this.sinon.stub(KeyboardManager, 'hideKeyboardImmediately');
      removeKeyboard = this.sinon.stub(KeyboardManager, 'removeKeyboard');
      this.sinon.stub(KeyboardManager, 'showIMESwitcher');
    });

    test('OOM event', function() {
      var fakeFrame = document.createElement('div');
      var fakeManifestURL = 'app://keyboard.gaiamobile.org/manifest.webapp';

      fakeFrame.dataset.frameManifestURL = fakeManifestURL;
      KeyboardManager.handleEvent({
        type: 'mozbrowsererror',
        target: fakeFrame
      });
      assert.ok(removeKeyboard.calledWith(fakeManifestURL));
    });

    test('mozbrowserresize event', function() {
      KeyboardManager.handleEvent({
        type: 'mozbrowserresize',
        detail: {
          height: 123
        },
        stopPropagation: function() {}
      });
      assert.ok(handleResize.called);
    });

    test('attentionscreenshow event', function() {
      trigger('attentionscreenshow');

      this.sinon.clock.tick();
      sinon.assert.callCount(hideKeyboardImmediately, 1);
    });

    test('activityclosing event', function() {
      trigger('activityclosing');
      assert.ok(hideKeyboardImmediately.called);
    });

    test('activityopening event', function() {
      trigger('activityopening');
      assert.ok(hideKeyboardImmediately.called);
    });

    test('activityrequesting event', function() {
      trigger('activityrequesting');
      assert.ok(hideKeyboardImmediately.called);
    });

    test('applicationsetupdialogshow event', function() {
      trigger('applicationsetupdialogshow');
      assert.ok(hideKeyboardImmediately.called);
    });

    test('sheetstransitionstart event: do nothing if no keyboard', function() {
      var spy = this.sinon.spy(navigator.mozInputMethod, 'removeFocus');
      trigger('sheetstransitionstart');
      assert.ok(spy.notCalled);
    });

    test('sheetstransitionstart event: hide keyboard if needed', function() {
      var realActive = KeyboardManager.hasActiveKeyboard;
      KeyboardManager.hasActiveKeyboard = true;
      var spy = this.sinon.spy(navigator.mozInputMethod, 'removeFocus');
      trigger('sheetstransitionstart');
      sinon.assert.calledOnce(spy);

      KeyboardManager.hasActiveKeyboard = realActive;
    });

    test('lock event: do nothing if no keyboard', function() {
      var spy = this.sinon.spy(navigator.mozInputMethod, 'removeFocus');
      trigger('lockscreen-appopened');
      assert.ok(spy.notCalled);
    });

    test('lock event: hide keyboard if needed', function() {
      var realActive = KeyboardManager.hasActiveKeyboard;
      KeyboardManager.hasActiveKeyboard = true;
      var spy = this.sinon.spy(navigator.mozInputMethod, 'removeFocus');
      trigger('lockscreen-appopened');
      sinon.assert.calledOnce(spy);

      KeyboardManager.hasActiveKeyboard = realActive;
    });
  });

  suite('Hide Keyboard', function() {
    var rsk;

    setup(function() {
      KeyboardManager.keyboardFrameContainer.classList.remove('hide');
      rsk = this.sinon.spy(KeyboardManager, 'resetShowingKeyboard');
    });

    test('resetShowingKeyboard wait until transition done', function() {
      KeyboardManager.transitionManager.handleResize(123);

      KeyboardManager.hideKeyboard();

      sinon.assert.notCalled(rsk, 'Wait for transform transition');

      dispatchEventForOpacity();

      sinon.assert.notCalled(rsk, 'Still wait for transform transition');

      dispatchEventForTransform();

      sinon.assert.callCount(rsk, 1, 'resetShowingKeyboard was called');
    });

    test('Show immediately after hide should not destroy', function() {
      KeyboardManager.transitionManager.handleResize(123);

      KeyboardManager.hideKeyboard();

      KeyboardManager.transitionManager.handleResize(123);

      dispatchTransitionEvents();

      sinon.assert.callCount(rsk, 0);
      assert.isFalse(
        KeyboardManager.keyboardFrameContainer.classList.contains('hide')
      );
    });

    suite('HideImmediately', function() {
      var kh, khed, container;

      setup(function() {
        kh = sinon.stub();
        khed = sinon.stub();
        window.addEventListener('keyboardhide', kh);
        window.addEventListener('keyboardhidden', khed);

        container = KeyboardManager.keyboardFrameContainer;
        this.sinon.spy(container.classList, 'add');

        KeyboardManager.transitionManager.handleResize(123);

        KeyboardManager.hideKeyboardImmediately();
      });

      teardown(function() {
        window.removeEventListener('keyboardhide', kh);
        window.removeEventListener('keyboardhidden', khed);
      });

      test('should not play animation', function() {
        sinon.assert.calledWith(
          container.classList.add, 'no-transition'
        );
      });

      test('emits events', function() {
        sinon.assert.callCount(rsk, 1, 'resetShowingKeyborad');
        sinon.assert.callCount(kh, 1, 'keyboardhide event');
        sinon.assert.callCount(khed, 1, 'keyboardhidden event');
      });
    });

    suite('HideImmediately should not trigger event if already hidden',
      function() {
        var kh, khed, container;

        setup(function() {
          kh = sinon.stub();
          khed = sinon.stub();
          window.addEventListener('keyboardhide', kh);
          window.addEventListener('keyboardhidden', khed);

          container = KeyboardManager.keyboardFrameContainer;
          container.classList.add('hide');

          KeyboardManager.hideKeyboardImmediately();
        });

        teardown(function() {
          window.removeEventListener('keyboardhide', kh);
          window.removeEventListener('keyboardhidden', khed);
        });

        test('no events', function() {
          sinon.assert.callCount(kh, 0, 'keyboardhide event');
          sinon.assert.callCount(khed, 0, 'keyboardhidden event');
        });
      });

    test('Hide emits events', function() {
      var kh = sinon.stub();
      var khed = sinon.stub();
      window.addEventListener('keyboardhide', kh);
      window.addEventListener('keyboardhidden', khed);

      KeyboardManager.transitionManager.handleResize(123);

      KeyboardManager.hideKeyboard();
      sinon.assert.callCount(kh, 1, 'keyboardhide event');
      var fakeEvt = new CustomEvent('transitionend');
      fakeEvt.propertyName = 'transform';
      KeyboardManager.keyboardFrameContainer.dispatchEvent(fakeEvt);

      sinon.assert.callCount(rsk, 1, 'resetShowingKeyborad');
      sinon.assert.callCount(kh, 1, 'keyboardhide event');
      sinon.assert.callCount(khed, 1, 'keyboardhidden event');
    });
  });

  suite('Show Keyboard', function() {
    var rsk;
    setup(function() {
      KeyboardManager.keyboardFrameContainer.classList.add('hide');
      this.sinon.stub(KeyboardManager, 'showIMESwitcher');
      rsk = this.sinon.spy(KeyboardManager, 'resetShowingKeyboard');
    });

    test('Hide immediately after show should destroy', function() {

      var called = false;
      window.addEventListener('keyboardchange', function() {
        called = true;
      });

      KeyboardManager.setKeyboardToShow('text');

      KeyboardManager.transitionManager.handleResize(123);

      KeyboardManager.hideKeyboard();
      dispatchTransitionEvents();

      sinon.assert.callCount(rsk, 1, 'ResetShowingKeyboard called');
      assert.equal(called, false, 'KeyboardChange event fired');
      assert.isTrue(
        KeyboardManager.keyboardFrameContainer.classList.contains('hide'));
    });
  });

  suite('mozbrowserresize event test', function() {
    var handleResize;
    setup(function() {
      handleResize =
        this.sinon.spy(KeyboardManager.transitionManager, 'handleResize');
      this.sinon.stub(KeyboardManager, 'showIMESwitcher');
    });

    function fakeMozbrowserResize(height) {
      KeyboardManager.handleEvent({
        type: 'mozbrowserresize',
        detail: { height: height },
        stopPropagation: sinon.stub()
      });
    }

    test('keyboardFrameContainer is ready to show.', function() {
      KeyboardManager.setKeyboardToShow('text');
      fakeMozbrowserResize(200);
      sinon.assert.callCount(handleResize, 1, 'handleResize should be called');
    });

    test('Switching keyboard.', function() {
      KeyboardManager.setKeyboardToShow('text');
      fakeMozbrowserResize(200);
      dispatchTransitionEvents();

      fakeMozbrowserResize(250);
      assert.equal(KeyboardManager.getHeight(), 250);
      sinon.assert.callCount(handleResize, 2,
                                        'handleResize should be called twice');
    });

    test('keyboard is showing.', function() {
      KeyboardManager.setKeyboardToShow('text');
      fakeMozbrowserResize(300);
      fakeMozbrowserResize(350);
      assert.equal(KeyboardManager.getHeight(), 350);
      sinon.assert.callCount(handleResize, 2,
                                        'handleResize should be called twice');
    });
  });

  suite('Focus and Blur', function() {
    setup(function() {
      this.sinon.stub(KeyboardManager, 'hideKeyboard');
      this.sinon.stub(KeyboardManager, 'setKeyboardToShow');
      this.sinon.stub(KeyboardManager, 'showIMESwitcher');
      KeyboardManager.keyboardLayouts = {
        text: {
          activeLayout: {}
        }
      };
    });

    test('Blur should hide', function() {
      simulateInputChangeEvent('blur');

      this.sinon.clock.tick(BLUR_CHANGE_DELAY);

      sinon.assert.callCount(KeyboardManager.hideKeyboard, 1);
      sinon.assert.notCalled(KeyboardManager.setKeyboardToShow);
    });

    test('Focus should show', function() {
      simulateInputChangeEvent('text');

      sinon.assert.notCalled(KeyboardManager.hideKeyboard);
      sinon.assert.callCount(KeyboardManager.setKeyboardToShow, 1);
    });

    test('Blur followed by focus should not hide', function() {
      simulateInputChangeEvent('blur');
      simulateInputChangeEvent('text');
      this.sinon.clock.tick(BLUR_CHANGE_DELAY);

      sinon.assert.callCount(KeyboardManager.hideKeyboard, 0);
      sinon.assert.callCount(KeyboardManager.setKeyboardToShow, 1);
    });
  });
});
