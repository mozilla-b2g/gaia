/* global Tutorial, MockFinishScreen*/
'use strict';

requireApp('ftu/test/unit/mock_l10n.js');
requireApp('ftu/test/unit/mock_screenlayout.js');
requireApp('ftu/test/unit/mock_finish_screen.js');

requireApp('ftu/js/finish_screen.js');
requireApp('ftu/js/utils.js');
requireApp('ftu/js/tutorial.js');

suite('Tutorial >', function() {
  var mocksHelperForFTU = new MocksHelper([
    'ScreenLayout',
    'FinishScreen'
  ]).init();

  mocksHelperForFTU.attachTestHelpers();

  var realL10n;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    loadBodyHTML('/index.html');

    Tutorial.init();
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    realL10n = null;

    document.body.innerHTML = '';
  });

  test(' is shown properly after Tutorial.init', function() {
    // Is the tutorial shown?
    assert.isTrue(
      document.getElementById('tutorial').classList.contains('show')
    );
  });

  test(' check dataset after Tutorial.init', function() {
    // Are we in Step 1?
    assert.equal(
      document.getElementById('tutorial').dataset.step,
      1
    );
  });

  test(' forward', function() {
    Tutorial.next();
     // Are we in Step 2?
    assert.equal(
      document.getElementById('tutorial').dataset.step,
      2
    );
  });

  test(' back', function() {
    Tutorial.back();
     // Are we in Step 1?
    assert.equal(
      document.getElementById('tutorial').dataset.step,
      1
    );
  });

  test(' text & image are the right ones for the current step (2)', function() {
    // Spy the l10n
    this.sinon.spy(navigator.mozL10n, 'localize');
    // Move forwad again
    Tutorial.next();
     // Are we in Step 2?
    assert.equal(
      document.getElementById('tutorial').dataset.step,
      2
    );
    // We are in step 2 and taking into account the current layout
    var l10nKey = 'tutorial-step2-' + MockScreenLayout._currentDevice;
    assert.equal(navigator.mozL10n.localize.args[0][1], l10nKey);
    // Now we check the image. As we are in 'tiny' (default layout in the mock)
    // there is no prefix
    var imgSRC =
      document.getElementById('tutorial-step-image').querySelector('img').src;
    assert.isTrue(imgSRC.contains('2.png'));
  });

  test(' hide the tutorial when done and move to FinishScreen', function() {
    this.sinon.spy(FinishScreen, 'init');
    // Call to 'done' method
    Tutorial.done();
    // Is the tutorial hidden now?
    assert.isFalse(
      document.getElementById('tutorial').classList.contains('show')
    );
    // Have we called to FinishScreen?
    assert.isTrue(FinishScreen.init.calledOnce);
    // Reset the spy
    FinishScreen.init.reset();
  });
});
