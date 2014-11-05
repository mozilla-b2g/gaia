/* global LockScreenStatePanelHide */

'use strict';

// Must mock dependencies here.
window.LockScreenBaseState = function() {};
requireApp('system/lockscreen/js/lockscreen_state_panelhide.js');
suite('sytem/LockScreenStatePanelHide', function() {
  var subject;
  var mockLockScreen;
  setup(function() {
    mockLockScreen = {
      overlay: document.createElement('div')
    };
    subject = (new LockScreenStatePanelHide()).start(mockLockScreen);
  });
  test('it would change the DOM status as it expects', function() {
    subject.transferTo().then(function() {
      assert.equal(mockLockScreen.overlay.dataset.panel, 'passcode',
        'it doesn\'t change the panel to show the slide');
      assert.equal(mockLockScreen.overlay.dataset.passcodeStatus, 'success',
        'it doesn\'t set the passcode status to the correct one');
    });
  });
});
