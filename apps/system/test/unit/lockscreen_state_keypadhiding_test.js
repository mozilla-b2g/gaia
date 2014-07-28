/* global LockScreenStateKeypadHiding */

'use strict';
requireApp('system/js/lockscreen_state_keypadhiding.js');
suite('sytem/LockScreenStateKeypadHiding', function() {
  var subject;
  var mockLockScreen;
  setup(function() {
    mockLockScreen = {
      overlay: document.createElement('div')
    };
    subject = (new LockScreenStateKeypadHiding()).start(mockLockScreen);
  });
  test('it would change the DOM status as it expects', function() {
    subject.transferTo();
    assert.isFalse(mockLockScreen.overlay.classList.contains('no-transition'),
      'it would NOT still play transition even though we need it');
    assert.equal(mockLockScreen.overlay.dataset.panel, 'main',
      'it doesn\'t change the panel value to trigger the animation');
  });
});
