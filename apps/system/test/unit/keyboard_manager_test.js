/*global requireApp suite test assert setup teardown suiteSetup
  KeyboardManager Applications sinon KeyboardHelper mocha
  MocksHelper MockSettingsListener */
mocha.globals(['SettingsListener']);

require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/shared/test/unit/mocks/mock_keyboard_helper.js');
requireApp('system/js/keyboard_manager.js');
requireApp('system/shared/test/unit/mocks/mock_settings_listener.js');

// Prevent auto-init
Applications = {
  ready: false
};

suite('KeyboardManager', function() {
  var realSettingsListener;

  function trigger(event, detail) {
    if (!detail) {
      detail = {};
    }
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent(event, true, false, detail);
    window.dispatchEvent(evt);
  }

  new MocksHelper([
    'KeyboardHelper', 'LazyLoader'
  ]).init().attachTestHelpers();

  function setupHTML() {
    var rc = document.querySelector('#run-container');
    rc.innerHTML = '';

    rc.innerHTML += '<div id="keyboard-show-ime-list">' +
      '<div class="fake-notification"><div class="message tip"></div></div>' +
      '</div>';
    rc.innerHTML += '<div id="keyboards" class="hide">hoi</div>';
  }

  function injectCss(transition) {
    transition = transition || 'transform 0.05s ease';

    var el = document.getElementById('km-style');
    if (!el) {
      el = document.createElement('style');
      el.id = 'km-style';
      document.head.appendChild(el);
    }
    el.innerHTML =
      '#keyboards {\n' +
        'transform: translateY(0);\n' +
        'transition: ' + transition + ';\n' +
      '}\n' +
      '#keyboards.hide {\n' +
        'opacity: 0;\n' +
        'transform: translateY(100%);\n' +
      '}\n' +
      '.notransition {\n' +
        'transition: none !important;\n' +
      '}';
  }

  suiteSetup(function() {
    document.body.innerHTML += '<div id="run-container"></div>';
  });

  setup(function() {
    setupHTML();
    injectCss();

    realSettingsListener = window.SettingsListener;
    window.SettingsListener = MockSettingsListener;

    KeyboardManager.init();
  });

  suite('Transitions', function() {
    setup(function(next) {
      setTimeout(next, 500);
    });

    test('showKeyboard triggers transition', function(next) {
      var triggered = false;
      KeyboardManager.keyboardFrameContainer.addEventListener('transitionend',
        function() {
          triggered = true;
        });

      KeyboardManager.showKeyboard();

      setTimeout(function() {
        assert.equal(triggered, true);
        next();
      }, 100);
    });

    test('UpdateHeight waits until transition finished', function(next) {
      var called = false;
      window.addEventListener('keyboardchange', function() {
        called = true;
      });

      KeyboardManager.showKeyboard();
      KeyboardManager.resizeKeyboard({
        detail: { height: 200 },
        stopPropagation: sinon.stub()
      });

      // animation takes 50 ms. so 20 ms. is safe
      setTimeout(function() {
        assert.equal(called, false, 'KeyboardChange triggered 20 ms');
      }, 20);

      setTimeout(function() {
        assert.equal(called, true, 'KeyboardChange triggered 100 ms');
        next();
      }, 100);
    });

    test('ShowKeyboard waits for transform transition', function(next) {
      injectCss('opacity 0.05s ease, transform 0.3s ease');

      KeyboardManager.showKeyboard();

      setTimeout(function() {
        assert.equal(
          'transitionIn' in KeyboardManager.keyboardFrameContainer.dataset,
          true,
          'TransitionIn canceled due to opacity');
      }, 100);

      setTimeout(function() {
        assert.equal(
          'transitionIn' in KeyboardManager.keyboardFrameContainer.dataset,
          false,
          'TransitionIn not canceled due to transform');
        next();
      }, 350);
    });

    test('UpdateHeight waits for transform transition', function(next) {
      var called = false;
      window.addEventListener('keyboardchange', function() {
        called = true;
      });

      injectCss('opacity 0.05s ease, transform 0.3s ease');

      KeyboardManager.showKeyboard();
      KeyboardManager.resizeKeyboard({
        detail: { height: 200 },
        stopPropagation: sinon.stub()
      });

      setTimeout(function() {
        assert.equal(called, false, 'KeyboardChange triggered by opacity');
      }, 100);

      setTimeout(function() {
        assert.equal(called, true, 'KeyboardChange triggered by transform');
        next();
      }, 350);
    });

    test('ShowKeyboard waits for transform transition', function(next) {
      injectCss('opacity 0.05s ease, transform 0.3s ease');

      KeyboardManager.showKeyboard();

      setTimeout(function() {
        assert.equal(
          'transitionIn' in KeyboardManager.keyboardFrameContainer.dataset,
          true,
          'TransitionIn not canceled due to opacity');
      }, 100);

      setTimeout(function() {
        assert.equal(
          'transitionIn' in KeyboardManager.keyboardFrameContainer.dataset,
          false,
          'TransitionIn canceled due to transform');
        next();
      }, 350);
    });

    test('Call showKeyboard against visible keyboard', function(next) {
      KeyboardManager.showKeyboard();

      setTimeout(function() {
        var callback = sinon.stub();
        KeyboardManager.showKeyboard(callback);

        // should be called immediately
        sinon.assert.callCount(callback, 1);

        next();
      }, 100);
    });
  });

  suite('UpdateHeight', function() {
    setup(function(next) {
      setTimeout(next, 500);
    });
    test('Second updateHeight evt triggers keyboardchange', function(next) {
      var kcEvent = sinon.stub();
      window.addEventListener('keyboardchange', kcEvent);

      KeyboardManager.showKeyboard();

      KeyboardManager.resizeKeyboard({
        detail: { height: 100 },
        stopPropagation: function() {}
      });

      setTimeout(function() {
        sinon.assert.callCount(kcEvent, 1);
        assert.equal(kcEvent.args[0][0].detail.height, 100);

        KeyboardManager.resizeKeyboard({
          detail: { height: 200 },
          stopPropagation: function() {}
        });

        setTimeout(function() {
          sinon.assert.callCount(kcEvent, 2);
          assert.equal(kcEvent.args[1][0].detail.height, 200);

          next();
        }, 100);
      }, 100);
    });
  });

  suite('Switching keyboard focus', function() {
    setup(function() {
      this.clock = this.sinon.useFakeTimers();
      this.sinon.stub(KeyboardManager, 'showKeyboard');
      this.sinon.stub(KeyboardManager, 'hideKeyboard');
      this.sinon.stub(KeyboardManager, 'hideIMESwitcher');
      this.sinon.stub(KeyboardManager, 'showIMESwitcher');
      this.sinon.stub(KeyboardManager, 'setKeyboardToShow');
    });

    suite('keyboard type "url" - has enabled layouts', function() {
      setup(function() {
        this.getLayouts = this.sinon.stub(KeyboardHelper, 'getLayouts');
        this.checkDefaults = this.sinon.stub(KeyboardHelper, 'checkDefaults');
        MockKeyboardHelper.watchCallback(KeyboardHelper.layouts,
          { apps: true });
        trigger('mozChromeEvent', {
          type: 'inputmethod-contextchange',
          inputType: 'url'
        });
        // setTimeout is used to debouce this
        this.clock.tick(500);
      });
      test('does not request layouts or defaults', function() {
        assert.isFalse(this.getLayouts.called);
        assert.isFalse(this.checkDefaults.called);
      });
      test('shows "url" keyboard', function() {
        assert.ok(KeyboardManager.setKeyboardToShow.calledWith('url'));
        assert.ok(KeyboardManager.showKeyboard.called);
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
          trigger('mozChromeEvent', {
            type: 'inputmethod-contextchange',
            inputType: 'url'
          });
          // setTimeout is used to debouce this
          this.clock.tick(500);
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
          trigger('mozChromeEvent', {
            type: 'inputmethod-contextchange',
            inputType: 'url'
          });
          // setTimeout is used to debouce this
          this.clock.tick(500);
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

  suite('Hide Keyboard', function() {
    setup(function(next) {
      KeyboardManager.keyboardFrameContainer.classList.remove('hide');
      setTimeout(next, 100);
    });

    test('resetShowingKeyboard wait until transition done', function(next) {
      var rsk = KeyboardManager.resetShowingKeyboard = sinon.stub();

      KeyboardManager.hideKeyboard();

      setTimeout(function() {
        sinon.assert.callCount(rsk, 0, 'Wait for transition 30ms');
      }, 30);

      setTimeout(function() {
        sinon.assert.callCount(rsk, 1, 'Wait for transition 100ms');
        next();
      }, 100);
    });

    test('resetShowingKeyboard wait for transform', function(next) {
      var rsk = KeyboardManager.resetShowingKeyboard = sinon.stub();
      injectCss('opacity 0.05s ease, transform 0.3s ease');

      KeyboardManager.hideKeyboard();

      setTimeout(function() {
        sinon.assert.callCount(rsk, 0, 'Ran after opacity');
      }, 100);

      setTimeout(function() {
        sinon.assert.callCount(rsk, 1, 'Ran after transform');
        next();
      }, 350);
    });

    test('Show immediately after hide should not destroy', function(next) {
      var rsk = KeyboardManager.resetShowingKeyboard = sinon.stub();

      KeyboardManager.hideKeyboard();

      setTimeout(function() {
        KeyboardManager.showKeyboard();
      }, 20);

      setTimeout(function() {
        sinon.assert.callCount(rsk, 0);
        assert.equal(
          KeyboardManager.keyboardFrameContainer.classList.contains('hide'),
          false);
        next();
      }, 200);
    });

    test('HideImmediately should not play animation', function(next) {
      var triggered = false;
      KeyboardManager.keyboardFrameContainer.addEventListener('transitionend',
        function() {
          triggered = true;
        });

      KeyboardManager.hideKeyboardImmediately();

      setTimeout(function() {
        assert.equal(triggered, false);
        next();
      }, 300);
    });

    test('HideImmediately emits events', function() {
      var rsk = KeyboardManager.resetShowingKeyboard = sinon.stub();
      var kh = sinon.stub();
      window.addEventListener('keyboardhide', kh);

      KeyboardManager.hideKeyboardImmediately();

      sinon.assert.callCount(rsk, 1, 'resetShowingKeyborad');
      sinon.assert.callCount(kh, 1, 'keyboardhide event');
    });
  });

  suite('Show Keyboard', function() {
    setup(function(next) {
      KeyboardManager.keyboardFrameContainer.classList.add('hide');
      setTimeout(next, 100);
    });

    test('Hide immediately after show should destroy', function(next) {
      var rsk = KeyboardManager.resetShowingKeyboard = sinon.stub();

      var called = false;
      window.addEventListener('keyboardchange', function() {
        called = true;
      });

      KeyboardManager.showKeyboard();

      KeyboardManager.resizeKeyboard({
        detail: { height: 200 },
        stopPropagation: sinon.stub()
      });

      setTimeout(function() {
        KeyboardManager.hideKeyboard();
      }, 20);

      setTimeout(function() {
        sinon.assert.callCount(rsk, 1, 'ResetShowingKeyboard called');
        assert.equal(called, false, 'KeyboardChange event fired');
        assert.equal(
          KeyboardManager.keyboardFrameContainer.classList.contains('hide'),
          true);
        next();
      }, 200);
    });
  });
});
