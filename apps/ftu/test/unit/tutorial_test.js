/* global Tutorial, FinishScreen,
          MocksHelper, MockL10n
          MockNavigatorSettings */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('ftu/test/unit/mock_l10n.js');
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

  function MockXMLHttpRequest() {
    var mResponse = MockXMLHttpRequest.mResponse;
    this.open = function() {};
    this.send = function() {
      this.response = mResponse;
      this.timeout = setTimeout(this.onload.bind(this));
    };
    this.abort = function() {
      if (this.timeout) {
        clearTimeout(this.clearTimeout);
      }
    };
  }
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

  var realL10n;
  var realMozApps;
  var realMozSettings;
  var realXHR;

  suiteSetup(function(done) {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;

    realMozSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    loadBodyHTML('/index.html');

    realXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = MockXMLHttpRequest;

    requireApp('ftu/js/tutorial.js', done);
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
    navigator.mozApps = realMozApps;
    navigator.mozSettings = realMozSettings;
    realL10n = null;
    window.XMLHttpRequest = realXHR;
    realXHR = null;
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
    MockXMLHttpRequest.mResponse = mockConfig(2);
    Tutorial.loadConfig().then(onOutcome, onOutcome)
                         .then(done, done);
    function onOutcome() {
      assert.equal(Tutorial.config['default'].steps.length, 2);
    };
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
      MockXMLHttpRequest.mResponse = {
        'default': {
          steps: [{
            video: '/style/images/tutorial/NotThere.mp4',
            l10nKey: 'tutorial-vertical-scroll-tiny'
          }]
        }
      };
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
    suiteSetup(function(done) {
      Tutorial.reset();

      MockXMLHttpRequest.mResponse = mockConfig(3);

      Tutorial.init();
      Tutorial.start(function() {
        done();
      });
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
      this.sinon.spy(navigator.mozL10n, 'localize');
      // Move forwad again
      function onNextLoaded() {
         // Are we in Step 2?
        assert.equal(
          document.getElementById('tutorial').dataset.step,
          2
        );
        // We are in step 2 and taking into account the current layout
        assert.equal(navigator.mozL10n.localize.args[0][1],
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

  suite(' progressbar', function() {
    suiteSetup(function() {
      Tutorial.reset();
    });
    teardown(function() {
      Tutorial.reset();
    });

    test(' dont display with 3 steps', function(done) {
      MockXMLHttpRequest.mResponse = mockConfig(3);
      Tutorial.init();
      Tutorial.start(function() {
        assert.equal(Tutorial.config['default'].steps.length, 3);
        var tutorialNode = document.getElementById('tutorial');
        assert.ok(!tutorialNode.hasAttribute('data-progressbar'), '');
        done();
      });
    });

    test(' do display with 4 steps', function(done) {
      MockXMLHttpRequest.mResponse = mockConfig(4);
      Tutorial.init();
      Tutorial.start(function() {
        assert.equal(Tutorial.config['default'].steps.length, 4);
        var tutorialNode = document.getElementById('tutorial');
        assert.ok(tutorialNode.hasAttribute('data-progressbar'));
        done();
      });
    });

  });

  suite('IAC Message >', function() {
    teardown(function() {
      Tutorial.reset();
      MockNavigatormozApps.mTeardown();
    });

    function setHomescreenManifest(url) {
      var obj = {'homescreen.manifestURL': url};
      MockNavigatorSettings.createLock().set(obj);
    }

    test('will send message', function(done) {
      var url = 'app://verticalhome.gaiamobile.org/manifest.webapp';
      setHomescreenManifest(url);
      Tutorial.init(null, function() {
        MockNavigatormozApps.mTriggerLastRequestSuccess();
        assert.equal(MockNavigatormozApps.mLastConnectionKeyword,
                     'migrate');
        done();
      });
    });

    test('will not send message', function(done) {
      var url = 'app://homescreen.gaiamobile.org/manifest.webapp';
      setHomescreenManifest(url);
      Tutorial.init(null, function() {
        assert.isNull(MockNavigatormozApps.mLastRequest);
        done();
      });
    });
  });
});
