/*global
  KeyboardManager, sinon, KeyboardHelper, MockKeyboardHelper,
  MocksHelper, TransitionEvent, MockNavigatorSettings */
'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_keyboard_helper.js');
require('/shared/test/unit/mocks/mock_settings_listener.js');
require('/test/unit/mock_applications.js');
requireApp('system/js/keyboard_manager.js');

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

    KeyboardManager.keyboardFrameContainer.dispatchEvent(transitionEnd);
  }

  function dispatchEventForTransform() {
    var transitionEnd = new TransitionEvent(
      'transitionend',
      {
        propertyName: 'transform',
        elapsedTime: 0.4
      }
    );

    KeyboardManager.keyboardFrameContainer.dispatchEvent(transitionEnd);
  }

  function dispatchTransitionEvents() {
    dispatchEventForOpacity();
    dispatchEventForTransform();
  }

  mocksHelperForKeyboardManager.attachTestHelpers();

  suiteSetup(function() {
    document.body.innerHTML += '<div id="run-container"></div>';
  });

  setup(function() {
    // we use sinon's fake timers for all the tests so that the timeouts used in
    // the tested code in one test don't disturb the next test.
    this.sinon.useFakeTimers();

    setupHTML();

    KeyboardManager.init();
  });

  suite('Transitions', function() {
    setup(function() {
      this.sinon.stub(KeyboardManager, 'showIMESwitcher');
    });

    suite('showKeyboard', function() {
      test('triggers transition', function() {
        assert.isTrue(
          KeyboardManager.keyboardFrameContainer.classList.contains('hide')
        );

        KeyboardManager.showKeyboard();

        assert.isFalse(
          KeyboardManager.keyboardFrameContainer.classList.contains('hide')
        );
      });

      test('waits the transition end before calling callback', function() {
        var callback = sinon.stub();
        KeyboardManager.showKeyboard(callback);

        sinon.assert.notCalled(callback);

        dispatchEventForOpacity();

        sinon.assert.notCalled(callback,
          'transitionend for opacity does not trigger the callback');

        assert.isTrue(
          'transitionIn' in KeyboardManager.keyboardFrameContainer.dataset,
          'TransitionIn canceled due to opacity');

        dispatchEventForTransform();

        sinon.assert.called(callback,
            'KeyboardChange was dispatched after the transform transition');
        assert.isFalse(
          'transitionIn' in KeyboardManager.keyboardFrameContainer.dataset,
          'TransitionIn canceled due to opacity');
      });

      test('does not wait transition if already visible', function() {
        KeyboardManager.showKeyboard();

        dispatchTransitionEvents();

        var callback = sinon.stub();
        KeyboardManager.showKeyboard(callback);

        // should be called immediately
        sinon.assert.callCount(callback, 1);
      });
    });
  });

  suite('UpdateHeight', function() {
    setup(function() {
      this.sinon.stub(KeyboardManager, 'showIMESwitcher');
    });

    test('waits until transition finished', function() {
      var called = false;
      window.addEventListener('keyboardchange', function() {
        called = true;
      });

      KeyboardManager.setKeyboardToShow('text');
      KeyboardManager.resizeKeyboard({
        detail: { height: 200 },
        stopPropagation: sinon.stub()
      });

      assert.isFalse(called, 'KeyboardChange wait for the transition');

      dispatchEventForOpacity();

      assert.isFalse(called,
          'KeyboardChange is not triggered for the opacity transition');
      assert.isTrue(
        'transitionIn' in KeyboardManager.keyboardFrameContainer.dataset,
        'TransitionIn canceled due to opacity');

      dispatchEventForTransform();

      assert.isTrue(called,
          'KeyboardChange was dispatched after the transform transition');
      assert.isFalse(
        'transitionIn' in KeyboardManager.keyboardFrameContainer.dataset,
        'TransitionIn canceled due to opacity');
    });

    test('Second updateHeight evt triggers keyboardchange', function() {
      var kcEvent = sinon.stub();
      window.addEventListener('keyboardchange', kcEvent);

      KeyboardManager.showKeyboard();

      dispatchTransitionEvents();

      KeyboardManager.resizeKeyboard({
        detail: { height: 100 },
        stopPropagation: function() {}
      });

      sinon.assert.callCount(kcEvent, 1);
      sinon.assert.calledWithMatch(kcEvent, { detail: { height: 100 }});

      kcEvent.reset();

      KeyboardManager.resizeKeyboard({
        detail: { height: 200 },
        stopPropagation: function() {}
      });

      sinon.assert.callCount(kcEvent, 1);
      sinon.assert.calledWithMatch(kcEvent,
          { detail: { height: 200 }});

    });
  });

  suite('Switching keyboard focus', function() {
    setup(function() {
      this.sinon.stub(KeyboardManager, 'showKeyboard');
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
        sinon.assert.callCount(KeyboardManager.resetShowingKeyboard, 1);
      });

      test('Switching from "text" to "text"', function() {
        simulateInputChangeEvent('text');
        this.sinon.clock.tick(BLUR_CHANGE_DELAY);
        simulateInputChangeEvent('text');
        this.sinon.clock.tick(BLUR_CHANGE_DELAY);

        sinon.assert.calledWith(KeyboardManager.setKeyboardToShow, 'text');
        sinon.assert.notCalled(KeyboardManager.resetShowingKeyboard);
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
      KeyboardManager.runningLayouts[fakeFrame_A.manifestURL] = {};
      KeyboardManager.runningLayouts[fakeFrame_A.manifestURL][fakeFrame_A.id] =
                                                              this.sinon.stub;
      var fakeFrame = document.createElement('div');
      fakeFrame.dataset.frameManifestURL =
        'app://keyboard.gaiamobile.org/manifest.webapp';

      KeyboardManager.showingLayout.frame = fakeFrame;
      KeyboardManager.removeKeyboard(fakeFrame_A.manifestURL);
      sinon.assert.callCount(hideKeyboard, 1);
      assert.equal(
        KeyboardManager.runningLayouts.hasOwnProperty(fakeFrame_A.manifestURL),
        false);
    });
  });

  suite('Event handler', function() {
    var resizeKeyboard, hideKeyboardImmediately, removeKeyboard;
    setup(function() {
      resizeKeyboard = this.sinon.stub(KeyboardManager, 'resizeKeyboard');
      hideKeyboardImmediately =
            this.sinon.stub(KeyboardManager, 'hideKeyboardImmediately');
      removeKeyboard = this.sinon.stub(KeyboardManager, 'removeKeyboard');
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
        type: 'mozbrowserresize'
      });
      assert.ok(resizeKeyboard.called);
    });

    test('attentionscreenshow event', function() {
      KeyboardManager.handleEvent({
        type: 'attentionscreenshow'
      });

      this.sinon.clock.tick();
      sinon.assert.callCount(hideKeyboardImmediately, 1);
    });

    test('activitywillopen event', function() {
      trigger('activitywillopen');
      assert.ok(hideKeyboardImmediately.called);
    });

    test('activitywillclose event', function() {
      trigger('activitywillclose');
      assert.ok(hideKeyboardImmediately.called);
    });

    test('appwillclose event', function() {
      trigger('appwillclose');
      assert.ok(hideKeyboardImmediately.called);
    });
  });

  suite('Hide Keyboard', function() {
    var rsk;

    setup(function() {
      KeyboardManager.keyboardFrameContainer.classList.remove('hide');
      rsk = this.sinon.spy(KeyboardManager, 'resetShowingKeyboard');
    });

    test('resetShowingKeyboard wait until transition done', function() {
      KeyboardManager.hideKeyboard();

      sinon.assert.notCalled(rsk, 'Wait for transform transition');

      dispatchEventForOpacity();

      sinon.assert.notCalled(rsk, 'Still wait for transform transition');

      dispatchEventForTransform();

      sinon.assert.callCount(rsk, 1, 'resetShowingKeyboard was called');
    });

    test('Show immediately after hide should not destroy', function() {
      KeyboardManager.hideKeyboard();
      KeyboardManager.showKeyboard();

      dispatchTransitionEvents();

      sinon.assert.callCount(rsk, 0);
      assert.isFalse(
        KeyboardManager.keyboardFrameContainer.classList.contains('hide')
      );
    });

    suite('HideImmediately', function() {
      var kh, container;

      setup(function() {
        kh = sinon.stub();
        window.addEventListener('keyboardhide', kh);

        container = KeyboardManager.keyboardFrameContainer;
        this.sinon.spy(container.classList, 'add');

        KeyboardManager.hideKeyboardImmediately();
      });

      teardown(function() {
        window.removeEventListener('keyboardhide', kh);
      });

      test('should not play animation', function() {
        sinon.assert.calledWith(
          container.classList.add, 'notransition'
        );
      });

      test('emits events', function() {
        sinon.assert.callCount(rsk, 1, 'resetShowingKeyborad');
        sinon.assert.callCount(kh, 1, 'keyboardhide event');
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
      window.addEventListener('keyboardhide', kh);

      KeyboardManager.hideKeyboard();
      sinon.assert.callCount(kh, 1, 'keyboardhide event');
      var fakeEvt = new CustomEvent('transitionend');
      fakeEvt.propertyName = 'transform';
      KeyboardManager.keyboardFrameContainer.dispatchEvent(fakeEvt);

      sinon.assert.callCount(rsk, 1, 'resetShowingKeyborad');
      sinon.assert.callCount(kh, 1, 'keyboardhide event');
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

      KeyboardManager.resizeKeyboard({
        detail: { height: 200 },
        stopPropagation: sinon.stub()
      });

      KeyboardManager.hideKeyboard();
      dispatchTransitionEvents();

      sinon.assert.callCount(rsk, 1, 'ResetShowingKeyboard called');
      assert.equal(called, false, 'KeyboardChange event fired');
      assert.isTrue(
        KeyboardManager.keyboardFrameContainer.classList.contains('hide'));
    });
  });

  suite('mozbrowserresize event test', function() {
    var showKeyboard;
    setup(function() {
      showKeyboard = this.sinon.stub(KeyboardManager, 'showKeyboard');
      this.sinon.stub(KeyboardManager, 'showIMESwitcher');
    });

    function fakeMozbrowserResize(height) {
      KeyboardManager.handleEvent({
        type: 'mozbrowserresize',
        detail: { height: height },
        stopPropagation: sinon.stub()
      });
    }

    test('height is zero.', function() {
      fakeMozbrowserResize(0);
      sinon.assert.callCount(showKeyboard, 0,
                                          'showKeyboard should not be called');
    });

    test('keyboardFrameContainer is ready to show.', function() {
      KeyboardManager.setKeyboardToShow('text');
      fakeMozbrowserResize(200);
      sinon.assert.callCount(showKeyboard, 1, 'showKeyboard should be called');
    });

    test('keyboardFrameContainer is hiding.', function() {
      KeyboardManager.keyboardFrameContainer.classList.add('hide');
      KeyboardManager.keyboardFrameContainer.dataset.transitionOut = 'true';
      fakeMozbrowserResize(200);
      sinon.assert.callCount(showKeyboard, 0,
                                          'ignore mozbrowserresize event');
    });

    test('Switching keyboard.', function() {
      KeyboardManager.setKeyboardToShow('text');
      fakeMozbrowserResize(200);
      KeyboardManager.keyboardFrameContainer.classList.remove('hide');
      fakeMozbrowserResize(250);
      assert.equal(KeyboardManager.keyboardHeight, 250);
      sinon.assert.callCount(showKeyboard, 1,
                                        'showKeyboard should be called');
    });

    test('keyboard is showing.', function() {
      KeyboardManager.setKeyboardToShow('text');
      fakeMozbrowserResize(300);
      KeyboardManager.keyboardFrameContainer.classList.remove('hide');
      KeyboardManager.keyboardFrameContainer.dataset.transitionIn = 'true';
      fakeMozbrowserResize(350);
      assert.equal(KeyboardManager.keyboardHeight, 350);
      sinon.assert.callCount(showKeyboard, 1,
                                        'showKeyboard should be called once');
    });
  });

  suite('Focus and Blur', function() {
    setup(function() {
      this.sinon.stub(KeyboardManager, 'showKeyboard');
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
