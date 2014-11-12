/* global LockScreenStateSlideShow */

'use strict';

// Must mock dependencies here.
window.LockScreenBaseState = function() {};
requireApp('system/lockscreen/js/lockscreen_state_slideshow.js');
suite('sytem/LockScreenStateSlideShow', function() {
  var subject;
  var mockLockScreen;
  setup(function() {
    mockLockScreen = {
      overlay: document.createElement('div')
    };
    subject = (new LockScreenStateSlideShow()).start(mockLockScreen);
  });
  test('it would change the DOM status as it expects', function() {
    subject.transferTo().then(function() {
      assert.isTrue(mockLockScreen.overlay.classList.contains('no-transition'),
        'it still play transition even though we needn\'t it');
      assert.equal(mockLockScreen.overlay.dataset.panel, 'main',
        'it doesn\'t change the panel to show the slide');
    });
  });
});
