/* global LockScreenStateKeypadShow */

'use strict';

// Must mock dependencies here.
window.LockScreenBaseState = function() {};
requireApp('system/lockscreen/js/lockscreen_state_keypadshow.js');
suite('sytem/LockScreenStateKeypadShow', function() {
  var subject;
  var mockLockScreen;
  setup(function() {
    mockLockScreen = {
      overlay: document.createElement('div')
    };
    subject = (new LockScreenStateKeypadShow()).start(mockLockScreen);
  });
  test('it would change the DOM status as it expects', function() {
    subject.transferTo();
    assert.isTrue(mockLockScreen.overlay.classList.contains('no-transition'),
      'it would still play transition even though we needn\'t it');
    assert.equal(mockLockScreen.overlay.dataset.panel, 'passcode',
      'it doesn\'t change the panel value to the correct panel');
  });
});
