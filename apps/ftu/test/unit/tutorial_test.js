/* global Tutorial, FinishScreen,
          MocksHelper, MockL10n */
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
      function onOutcome(arg) {
        assert.isTrue(true, 'loadConfig promise was resolved');
      }
      function onReject(arg) {
        assert.isFalse(1, 'loadConfig promise was rejected');
      }

      var result = Tutorial.loadConfig();
      assert.ok(result && typeof result.then == 'function',
                'loadConfig returned a thenable');

      if (result) {
        result.then(onOutcome, onReject).then(done, done);
      } else {
        done();
      }
    });

    test('reset', function(done) {
      function onOutcome() {
        Tutorial.init();
        assert.ok(Tutorial.config);
        Tutorial.reset();
        assert.ok(!Tutorial.config);
      }
      Tutorial.loadConfig().then(onOutcome, onOutcome)
                           .then(done, done);
    });
  });

  suite(' post-init', function() {
    suiteSetup(function(done) {
      Tutorial.reset();
      Tutorial.init(null, done);
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

  suite(' progressbar', function() {
    function mockConfig(stepCount) {
      var steps = [];
      for (; stepCount; stepCount--) {
        steps.push({
          video: '/style/images/tutorial/VerticalScroll.mp4',
          l10nKey: 'tutorial-vertical-scroll-tiny'
        });
      }
      var config = {
        'default': {
          steps: steps
        }
      };
      return config;
    }
    var realXHR;
    function MockXMLHttpRequest() {
      this.open = function() {};
      this.send = function() {
        this.response = this.mResponse;
        this.timeout = setTimeout(this.onload.bind(this));
      };
      this.abort = function() {
        if (this.timeout) {
          clearTimeout(this.clearTimeout);
        }
      };
    }

    suiteSetup(function() {
      window.XMLHttpRequest = MockXMLHttpRequest;
      Tutorial.reset();
    });
    suiteTeardown(function() {
      window.XMLHttpRequest = realXHR;
    });
    teardown(function() {
      Tutorial.reset();
    });
    test(' sanity test mocks', function(done) {
      XMLHttpRequest.prototype.mResponse = mockConfig(2);
      Tutorial.init(null, function() {
        assert.equal(Tutorial.config['default'].steps.length, 2);
        done();
      });
    });

    test(' dont display with 3 steps', function(done) {
      XMLHttpRequest.prototype.mResponse = mockConfig(3);
      Tutorial.init(null, function() {
        assert.equal(Tutorial.config['default'].steps.length, 3);
        var tutorialNode = document.getElementById('tutorial');
        assert.ok(!tutorialNode.hasAttribute('data-progressbar'), '');
        done();
      });
    });

    test(' do display with 4 steps', function(done) {
      XMLHttpRequest.prototype.mResponse = mockConfig(4);
      Tutorial.init(null, function() {
        assert.equal(Tutorial.config['default'].steps.length, 4);
        var tutorialNode = document.getElementById('tutorial');
        assert.ok(tutorialNode.hasAttribute('data-progressbar'));
        done();
      });
    });

  });

});
