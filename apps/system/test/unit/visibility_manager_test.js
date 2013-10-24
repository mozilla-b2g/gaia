'use strict';

mocha.globals(['VisibilityManager', 'LockScreen', 'WindowManager']);
requireApp('system/test/unit/mock_lock_screen.js');
requireApp('system/test/unit/mock_window_manager.js');

function switchProperty(originObject, prop, stub, reals, useDefineProperty) {
  if (!useDefineProperty) {
    reals[prop] = originObject[prop];
    originObject[prop] = stub;
  } else {
    Object.defineProperty(originObject, prop, {
      configurable: true,
      get: function() { return stub; }
    });
  }
}

function restoreProperty(originObject, prop, reals, useDefineProperty) {
  if (!useDefineProperty) {
    originObject[prop] = reals[prop];
  } else {
    Object.defineProperty(originObject, prop, {
      configurable: true,
      get: function() { return reals[prop]; }
    });
  }
}

suite('system/VisibilityManager', function() {
  var reals = {};

  setup(function(done) {
    switchProperty(window, 'WindowManager', MockWindowManager, reals);
    switchProperty(window, 'LockScreen', MockLockScreen, reals);
    requireApp('system/js/visibility_manager.js', done);
  });

  teardown(function() {
    MockLockScreen.mTeardown();
    MockWindowManager.mTeardown();
    restoreProperty(window, 'WindowManager', reals);
    restoreProperty(window, 'LockScreen', reals);
  });

  test('lock', function() {
    var caught = false;
    window.addEventListener('hidewindows', function hideall() {
      window.removeEventListener('hidewindows', hideall);
      caught = true;
    });
    window.addEventListener('hidewindow', function hidetop() {
      window.removeEventListener('hidewindow', hidetop);
    });
    window.dispatchEvent(new Event('lock'));
    assert.isTrue(caught);
  });

  test('will-unlock', function() {
    var caught = false;
    window.addEventListener('showwindows', function showall() {
      window.removeEventListener('hidewindows', showall);
      caught = true;
    });
    window.addEventListener('hidewindow', function showtop() {
      window.removeEventListener('hidewindow', showtop);

    });
    window.dispatchEvent(new Event('will-unlock'));
    assert.isTrue(caught);
  });
});
