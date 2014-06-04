/* global Tutorial, MockFinishScreen */
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
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    realL10n = null;
    document.body.innerHTML = '';
  });

  suite(' lifecycle', function() {
    teardown(function() {
      Tutorial.reset();
    });
    test('init before loadConfig', function() {
      Tutorial.init();
      assert.ok(!Tutorial.config, 'Tutorial.config not yet defined');
    });

    test('promised config', function(done) {
      var result = Tutorial.loadConfig();
      assert.equal(typeof result.then, 'function',
                  'return value has a then method');

      result.then(function() {
        assert.ok(Tutorial.config);
        done();
      });
    });

    test('reset', function(done) {
      Tutorial.loadConfig().then(function() {
        Tutorial.init();
        assert.ok(Tutorial.config);
        Tutorial.reset();
        assert.ok(!Tutorial.config);
        done();
      });
    });
  });

  suite(' post-init', function() {
    suiteSetup(function(done) {
      Tutorial.loadConfig().then(function() {
        Tutorial.init(null, done);
      });
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

    test(' text & src are the right ones for the current step (2)',
      function() {
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
      var l10nKey = 'tutorial-notifications-tiny';
      assert.equal(navigator.mozL10n.localize.args[0][1], l10nKey);
      // Now we check the element src.
      // As we are in 'tiny' (default layout in the mock)
      // the 2nd step should be notifications
      var imgSRC = document.querySelector(
                    '#tutorial-step-media > *:not([hidden])'
                   ).src;
      assert.isTrue(imgSRC.contains('Notifications.mp4'));
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

});
