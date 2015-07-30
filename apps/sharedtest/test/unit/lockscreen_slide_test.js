/* global LockScreenSlide */

'use strict';

require('/shared/js/lockscreen_slide.js');
require('/shared/js/screen_layout.js');

suite('LockScreenSlide', function() {
  var lockscreenSlide, unlockButton, cameraButton;

  suiteSetup(function() {
    document.body.innerHTML =
      '<div id="lockscreen">' +
        '<div id="lockscreen-area"></div>' +
        '<div id="lockscreen-area-camera" role="button"></div>' +
        '<div id="lockscreen-area-unlock" role="button"></div>' +
        '<div id="lockscreen-canvas-wrapper">' +
          '<canvas id="lockscreen-canvas"></canvas>' +
        '</div>' +
      '</div>';
      unlockButton = document.getElementById('lockscreen-area-unlock');
      cameraButton = document.getElementById('lockscreen-area-camera');
  });

  suiteTeardown(function() {
    document.body.innerHTML = '';
  });

  suite('Instance', function() {
    suiteSetup(function() {
      lockscreenSlide = new LockScreenSlide({});
    });

    test('OptionMenu', function() {
      assert.ok(LockScreenSlide);
      assert.ok(LockScreenSlide.prototype.publish);
    });

    suite('Accessibility', function() {
      var stubPublish;

      function dispatchAccessibleClick(elem) {
        // A synthesized mouse event will trigger the button, but a physical one
        // won't. Because both this script and the screenreader show an
        // event.mozInputSource of UNKNOWN.
        elem.dispatchEvent(new MouseEvent('click'));
      }

      setup(function() {
        stubPublish = this.sinon.stub(lockscreenSlide, 'publish');
      });

      test('Click unlock button', function() {
        dispatchAccessibleClick(unlockButton);
        sinon.assert.calledWith(stubPublish, 'lockscreenslide-activate-right');
      });

      test('Click camera button', function() {
        dispatchAccessibleClick(cameraButton);
        sinon.assert.calledWith(stubPublish, 'lockscreenslide-activate-left');
      });
    });
  });
});
