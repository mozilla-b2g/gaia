/* global LockScreenStateSlideRestore */

'use strict';

// Must mock dependencies here.
window.LockScreenBaseState = function() {};
requireApp('system/lockscreen/js/lockscreen_state_sliderestore.js');
suite('sytem/LockScreenStateSlideRestore', function() {
  var subject;
  var mockLockScreen;
  setup(function() {
    mockLockScreen = {
      overlay: document.createElement('div'),
      _unlocker: {
        restore: this.sinon.stub()
      }
    };
    subject = (new LockScreenStateSlideRestore()).start(mockLockScreen);
  });
  test('it would change the DOM status as it expects', function() {
    subject.transferTo().then(function() {
      assert.isTrue(mockLockScreen._unlocker.restore.called,
        'the slide doesn\'t restore');
    });
  });
});
