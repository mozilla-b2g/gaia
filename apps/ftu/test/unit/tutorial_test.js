/* global Tutorial, FinishScreen, LazyLoader,
          MocksHelper, MockL10n, MockNavigatormozApps,
          MockNavigatorSettings */
'use strict';

require('/shared/js/lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('ftu/test/unit/mock_screenlayout.js');
requireApp('ftu/test/unit/mock_finish_screen.js');

requireApp('ftu/js/finish_screen.js');
requireApp('ftu/js/utils.js');

suite('Tutorial >', function() {
  var mocksHelperForFTU = new MocksHelper([
    'ScreenLayout',
    'FinishScreen'
  ]).init();

  mocksHelperForFTU.attachTestHelpers();

  function mockConfig(stepCount) {
    var steps = [];
    for (; stepCount; stepCount--) {
      steps.push({
        video: '/style/images/tutorial/VerticalScroll.mp4',
        l10nKey: 'tutorial-vertical-scroll-v2-tiny'
      });
    }
    var config = {
      'default': {
        steps: steps
      }
    };
    return config;
  }

  var realL10n;
  var realMozApps;
  var realMozSettings;

  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    loadBodyHTML('/index.html');

    requireApp('ftu/js/tutorial.js', done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozApps = realMozApps;
    navigator.mozSettings = realMozSettings;
    realL10n = null;
    document.body.innerHTML = '';
  });

  teardown(function() {
    MockNavigatormozApps.mTeardown();
  });

  test(' sanity test Tutorial', function() {
    assert.equal(typeof Tutorial, 'object');
    assert.equal(typeof Tutorial.loadConfig, 'function');
    assert.equal(typeof Tutorial.init, 'function');
    assert.equal(typeof Tutorial.start, 'function');
  });

  test(' sanity test mocks', function(done) {
    this.sinon.stub(LazyLoader, 'getJSON')
              .returns(Promise.resolve(mockConfig(2)));
    Tutorial.loadConfig().then(onOutcome, onOutcome)
                         .then(done, done);
    function onOutcome() {
      assert.equal(Tutorial.config['default'].steps.length, 2);
    }
  });

  suite(' lifecycle', function() {
    teardown(function() {
      Tutorial.reset();
      document.getElementById('tutorial').classList.remove('show');
    });

    test('reset', function(done) {
      function onOutcome() {
        // config should be already loaded
        Tutorial.init();
        //
        assert.ok(Tutorial.config);
        Tutorial.reset();
        assert.ok(!Tutorial.config);
      }
      Tutorial.loadConfig().then(onOutcome, onOutcome)
                           .then(done, done);
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

    test('start during init', function(done) {
      Tutorial.init();
      Tutorial.start(function() {
        setTimeout(done, 0);
        assert.ok(Tutorial.config);
        assert.isTrue(
          document.getElementById('tutorial').classList.contains('show')
        );
      });
    });

    test('start after init', function(done) {
      Tutorial.init(null, function() {
        Tutorial.start(function() {
          setTimeout(done, 0);
          assert.ok(Tutorial.config);
          assert.isTrue(
            document.getElementById('tutorial').classList.contains('show')
          );
        });
      });
    });

    test('start despite failure to load media', function(done) {
      var tutorialWasInitialized = false;
      var jsonMock = {
        'default': {
          steps: [{
            video: '/style/images/tutorial/NotThere.mp4',
            l10nKey: 'tutorial-vertical-scroll-v2-tiny'
          }]
        }
      };
      this.sinon.stub(LazyLoader, 'getJSON').returns(Promise.resolve(jsonMock));
      window.addEventListener('tutorialinitialized', function() {
        tutorialWasInitialized = true;
      });
      Tutorial.init();
      Tutorial.start(function() {
        done(function() {
          assert.isTrue(tutorialWasInitialized, 'tutorialinitialized fired');
        });
      });
    });

  });

  suite(' post-init', function() {
    var getJSONStub;
    suiteSetup(function(done) {
      Tutorial.reset();

      getJSONStub = sinon.stub(LazyLoader, 'getJSON')
                         .returns(Promise.resolve(mockConfig(3)));

      Tutorial.init();
      Tutorial.start(function() {
        done();
      });
    });

    suiteTeardown(function() {
     getJSONStub.restore();
    });

    test(' is shown properly after Tutorial.start', function() {
      // Is the tutorial shown?
      assert.isTrue(
        document.getElementById('tutorial').classList.contains('show')
      );
    });

    test(' check dataset after Tutorial.start', function() {
      // Are we in Step 1?
      assert.equal(
        document.getElementById('tutorial').dataset.step,
        1
      );
    });

    test(' forward', function(done) {
      Tutorial.next().then(done, done);
       // Are we in Step 2?
      assert.equal(
        document.getElementById('tutorial').dataset.step,
        2
      );
    });

    test(' back', function(done) {
      Tutorial.back().then(done, done);
       // Are we in Step 1?
      assert.equal(
        document.getElementById('tutorial').dataset.step,
        1
      );
    });

    test(' text & src are the right ones for the current step (2)',
      function(done) {
      // Spy the l10n
      this.sinon.spy(navigator.mozL10n, 'setAttributes');
      // Move forwad again
      function onNextLoaded() {
         // Are we in Step 2?
        assert.equal(
          document.getElementById('tutorial').dataset.step,
          2
        );
        // We are in step 2 and taking into account the current layout
        assert.equal(navigator.mozL10n.setAttributes.args[0][1],
                    Tutorial.config['default'].steps[1].l10nKey);
        // Now we check the element src.
        // As we are in 'tiny' (default layout in the mock)
        // the 2nd step should be notifications
        var imgSRC = document.querySelector(
                      '#tutorial-step-media > *:not([hidden])'
                     ).src;
        assert.isTrue(imgSRC.contains('VerticalScroll.mp4'),
                      'Expected VerticalScroll.mp4 in ' + imgSRC);
      }
      Tutorial.next().then(onNextLoaded, onNextLoaded).then(done, done);
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
