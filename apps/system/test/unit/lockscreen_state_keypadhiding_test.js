/* global LockScreenStateKeypadHiding */

'use strict';

// Must mock dependencies here.
window.LockScreenBaseState = function() {};
requireApp('system/lockscreen/js/lockscreen_state_keypadhiding.js');
suite('sytem/LockScreenStateKeypadHiding', function() {
  var subject;
  var mockLockScreen;
  setup(function() {
    mockLockScreen = {
      overlay: document.createElement('div'),
      passcodePad: document.createElement('div'),
      passcodeCode: document.createElement('div')
    };
    subject = (new LockScreenStateKeypadHiding()).start(mockLockScreen);
  });
  test('it would change the DOM status as it expects', function(done) {
    this.sinon.stub(window, 'addEventListener', function(type, cb) {
      // When it add the listener, execcute the cb immediately,
      // since we can't control a closured function which
      // is hidden inside the promise resolver.
      cb({
        target: {
          classList: {
            contains: this.sinon.stub().returns(true)
          }
        }
      });
    });

    subject.transferTo().then(() => {
      assert.isFalse(mockLockScreen.overlay.classList.contains('no-transition'),
        'it would NOT still play transition even though we need it');
      assert.equal(mockLockScreen.overlay.dataset.panel, 'main',
        'it doesn\'t change the panel value to trigger the animation');
    })
    .then(done)
    .catch(done);
  });
});
