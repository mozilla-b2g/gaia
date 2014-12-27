/* global LockScreenStateKeypadRising */

'use strict';

// Must mock dependencies here.
window.LockScreenBaseState = function() {};
requireApp('system/lockscreen/js/lockscreen_state_keypadrising.js');
suite('sytem/LockScreenStateKeypadRising', function() {
  var subject;
  var mockLockScreen;
  setup(function() {
    mockLockScreen = {
      overlay: document.createElement('div')
    };
    subject = (new LockScreenStateKeypadRising()).start(mockLockScreen);
  });
  test('it would change the DOM status as it expects', function(done) {
    subject.transferTo().then(function() {
      assert.isFalse(mockLockScreen.overlay.classList.contains('no-transition'),
        'it would NOT still play transition even though we need it');
      assert.equal(mockLockScreen.overlay.dataset.panel, 'passcode',
        'it doesn\'t change the panel value to trigger the animation');
    })
    .then(done)
    .catch(done);
  });
});
