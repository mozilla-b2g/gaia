/* global LockScreenStateUnlock */

'use strict';

// Must mock dependencies here.
window.LockScreenBaseState = function() {};
requireApp('system/lockscreen/js/lockscreen_state_unlock.js');
suite('sytem/LockScreenStateUnlock', function() {
  var subject;
  var mockLockScreen;
  setup(function() {
    mockLockScreen = {
      unlock: this.sinon.stub()
    };
    subject = (new LockScreenStateUnlock()).start(mockLockScreen);
  });
  test('it would call unlock of LockScreen', function() {
    subject.transferTo().then(function() {
      assert.isTrue(mockLockScreen.unlock.called,
        'it doesn\'t unlock the screen');
    });
  });
});
