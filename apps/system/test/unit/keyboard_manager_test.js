/*global requireApp suite test assert setup teardown suiteSetup
  KeyboardManager Applications sinon */
requireApp('system/js/keyboard_manager.js');

// Prevent auto-init
Applications = {
  ready: false
};

suite('KeyboardManager', function() {
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
      '}';
  }

  suiteSetup(function() {
    injectCss();

    document.body.innerHTML += '<div id="run-container"></div>';
  });

  setup(function(next) {
    setupHTML();
    KeyboardManager.init();

    // Give some time to stabilize
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
});
