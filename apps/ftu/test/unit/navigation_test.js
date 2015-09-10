'use strict';
/* global
  MockIccHelper,
  MockL10n,
  MockNavigatormozApps,
  MockNavigatorMozMobileConnections,
  MockNavigatorSettings,
  MocksHelper,
  Navigation,
  SimManager,
  UIManager
*/
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_icc_helper.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_apps.js');
require('/shared/test/unit/mocks/mock_l10n.js');

requireApp('ftu/js/navigation.js');

requireApp('ftu/test/unit/mock_wifi_manager.js');
requireApp('ftu/test/unit/mock_data_mobile.js');
requireApp('ftu/test/unit/mock_sim_manager.js');
requireApp('ftu/test/unit/mock_sd_manager.js');
requireApp('ftu/test/unit/mock_import_services.js');
requireApp('ftu/test/unit/mock_ui_manager.js');
requireApp('ftu/test/unit/mock_tutorial.js');
requireApp('ftu/test/unit/mock_wifi_manager.js');
requireApp('ftu/test/unit/mock_utils.js');
requireApp('ftu/test/unit/mock_operatorVariant.js');
requireApp('ftu/test/unit/mock_navigation.html.js');

var mocksHelperForNavigation = new MocksHelper([
  'utils',
  'UIManager',
  'SimManager',
  'DataMobile',
  'OperatorVariant',
  'IccHelper',
  'Tutorial',
  'SdManager',
  'ImportIntegration',
  'WifiManager',
  'WifiUI'
]).init();

suite('navigation >', function() {
  var isOnLine = true;
  var realOnLine,
      realL10n,
      realMozMobileConnections,
      realMozApps,
      realSettings;

  function navigatorOnLine() {
    return isOnLine;
  }

  function setNavigatorOnLine(value) {
    isOnLine = value;
  }

  suiteSetup(function() {
    loadBodyHTML('/index.html');

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: navigatorOnLine,
      set: setNavigatorOnLine
    });
    MockIccHelper.setProperty('cardState', 'ready');

    realMozApps = navigator.mozApps;
    navigator.mozApps = MockNavigatormozApps;
  });

  suiteTeardown(function() {
    navigator.mozMobileConnections = realMozMobileConnections;
    realMozMobileConnections = null;

    navigator.mozSettings = realSettings;
    realSettings = null;

    navigator.mozL10n = realL10n;
    realL10n = null;

    if (realOnLine) {
      Object.defineProperty(navigator, 'onLine', realOnLine);
    } else {
      delete navigator.onLine;
    }
    document.body.innerHTML = '';
  });

  function setStepStateToIndex(current, callback) {
    Navigation.currentStepIndex = current;
    Navigation.previousStepIndex = current > 0 ? current - 1 : 0;
    Navigation.manageStep(callback);
  }

  // The mocks need the HTML markup
  mocksHelperForNavigation.attachTestHelpers();

  // Navigation.init needs the mocks
  setup(function() {
    Navigation.init();
    this.sinon.stub(Navigation, 'postStepMessage');
  });

  teardown(function() {
    Navigation.simMandatory = false;
    Navigation.uninit();
  });

  test('indexOfStep', function() {
    assert.equal(Navigation.indexOfStep('languages'), 0);
    assert.equal(Navigation.indexOfStep('browser_privacy'), 8);
    assert.equal(Navigation.indexOfStep('no_such_step'), -1);
  });

  test('stepAt', function() {
    assert.equal(Navigation.stepAt(0).id, 'languages');
    assert.equal(Navigation.stepAt(8).id, 'browser_privacy');
    assert.isUndefined(Navigation.stepAt(9));
  });

  suite('registerStep', function() {
    test(' > default position', function() {
      var newStep = { hash: '#new', };
      var oldStepCount = Navigation.stepCount;
      Navigation.registerStep(newStep);
      assert.equal(Navigation.stepCount, oldStepCount + 1);
      var lastIndex = Navigation.stepCount - 1;
      assert.ok(Navigation.stepAt(lastIndex));
      assert.equal(Navigation.stepAt(lastIndex).hash, newStep.hash);
    });
    test(' > beforeStep', function() {
      var newStep = { hash: '#new', beforeStep: 'browser_privacy' };
      var refIndex = Navigation.indexOfStep('browser_privacy');
      var oldStepCount = Navigation.stepCount;

      Navigation.registerStep(newStep);
      assert.equal(Navigation.stepCount, oldStepCount + 1);
      assert.equal(Navigation.stepAt(refIndex).hash, newStep.hash);

      setStepStateToIndex(refIndex);
      assert.equal(window.location.hash, newStep.hash);
      Navigation.forward();
      assert.equal(window.location.hash, '#browser_privacy');
    });
    test(' > afterStep', function() {
      var newStep = { hash: '#new', afterStep: 'languages' };
      var refIndex = Navigation.indexOfStep('languages');
      var oldStepCount = Navigation.stepCount;

      Navigation.registerStep(newStep);
      assert.equal(Navigation.stepCount, oldStepCount + 1);
      assert.equal(Navigation.stepAt(refIndex +1).hash, newStep.hash);

      setStepStateToIndex(refIndex + 1);
      assert.equal(window.location.hash, newStep.hash);
      Navigation.back();
      assert.equal(window.location.hash, '#languages');
      Navigation.forward();
      assert.equal(window.location.hash, newStep.hash);
    });
  });

  test('navigates forward', function() {
    MockIccHelper.setProperty('cardState', 'ready');
    Navigation.simMandatory = true;

    setStepStateToIndex(0);
    var lastIndex = Navigation.stepCount - 1;
    for (var i = Navigation.currentStepIndex; i < lastIndex; i++) {
      Navigation.forward();
      assert.equal(Navigation.previousStepIndex, i);
      assert.equal(Navigation.currentStepIndex, (i + 1));
      assert.equal(window.location.hash,
                   Navigation.stepAt(i + 1).hash);
      assert.isTrue(Navigation.postStepMessage.calledWith(i));
    }
  });

  test('navigates backwards', function() {
    MockIccHelper.setProperty('cardState', 'ready');
    Navigation.simMandatory = true;
    setStepStateToIndex(Navigation.stepCount - 1);
    // The second step isn't mandatory.
    for (var i = Navigation.currentStepIndex; i > 2; i--) {
      Navigation.back();
      assert.equal(Navigation.previousStepIndex, i);
      assert.equal(Navigation.currentStepIndex, i - 1);
      assert.equal(window.location.hash,
                   Navigation.stepAt(i - 1).hash);
    }
  });

  test('skips date and time when network time is available', function() {
    var oldTimeZoneNeedsConfirmation = UIManager.timeZoneNeedsConfirmation;
    UIManager.timeZoneNeedsConfirmation = false;
    UIManager.updateSetting = sinon.stub();

    MockIccHelper.setProperty('cardState', 'ready');
    Navigation.simMandatory = true;

    setStepStateToIndex(2);
    Navigation.forward();
    assert.equal(Navigation.previousStepIndex, 2);
    assert.equal(Navigation.currentStepIndex, 4);
    assert.equal(window.location.hash, Navigation.stepAt(4).hash);
    // Make sure we posted both steps.
    assert.isTrue(Navigation.postStepMessage.callCount > 1);

    UIManager.timeZoneNeedsConfirmation = oldTimeZoneNeedsConfirmation;
  });

  test('last step launches tutorial', function() {
    var lastIndex = Navigation.stepCount - 1;
    Navigation.currentStepIndex = lastIndex;
    setStepStateToIndex(lastIndex);

    Navigation.forward();
    assert.isTrue(UIManager.finishScreen.classList.contains('show'));
    assert.isFalse(UIManager.activationScreen.classList.contains('show'));
  });

  suite('UI changes>', function() {
    var observerConfig = {
      attributes: true
    };

    setup(function() {
      MockIccHelper.setProperty('cardState', 'ready');
      Navigation.simMandatory = false;
    });

    teardown(function() {
      Navigation.simMandatory = false;
    });

    test('languages screen >', function(done) {
      setStepStateToIndex(0);
      var observer = new MutationObserver(function() {
        done(function() {
          observer.disconnect();
          assert.equal(UIManager.mainTitle.getAttribute('data-l10n-id'),
            'language');
        });
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });

    test('data mobile screen >', function(done) {
      setStepStateToIndex(1);
      var observer = new MutationObserver(function() {
        done(function() {
          observer.disconnect();
          assert.equal(UIManager.mainTitle.getAttribute('data-l10n-id'), '3g');
        });
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });

    test('wifi screen >', function(done) {
      setStepStateToIndex(2);
      var observer = new MutationObserver(function() {
        done(function() {
          observer.disconnect();
          assert.equal(UIManager.mainTitle.getAttribute('data-l10n-id'),
            'selectNetwork');
          assert.isFalse(UIManager.navBar.classList.contains('secondary-menu'));
          assert.isFalse(UIManager.activationScreen.classList.contains(
                        'no-options'));
        });
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });

    test('date&time screen >', function(done) {
      setStepStateToIndex(3);
      var observer = new MutationObserver(function() {
        done(function() {
          observer.disconnect();
          assert.equal(UIManager.mainTitle.getAttribute('data-l10n-id'),
            'dateAndTime');
        });
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });

    test('geolocation screen >', function(done) {
      setStepStateToIndex(4);
      var observer = new MutationObserver(function() {
        done(function() {
          observer.disconnect();
          assert.equal(UIManager.mainTitle.getAttribute('data-l10n-id'),
            'geolocation');
        });
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });

    test('import contacts screen >', function(done) {
      setStepStateToIndex(5);
      var observer = new MutationObserver(function() {
        done(function() {
          observer.disconnect();
          assert.equal(UIManager.mainTitle.getAttribute('data-l10n-id'),
            'importContacts3');
        });
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });

    test('firefox accounts screen >', function(done) {
      setStepStateToIndex(6);
      var observer = new MutationObserver(function() {
        done(function() {
          observer.disconnect();
          assert.equal(UIManager.mainTitle.getAttribute('data-l10n-id'),
            'firefox-accounts');
        });
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });

    test('welcome screen >', function(done) {
      setStepStateToIndex(7);
      var observer = new MutationObserver(function(records) {
        done(function() {
          observer.disconnect();
          assert.equal(UIManager.mainTitle.getAttribute('data-l10n-id'),
            'aboutBrowser');
        });
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });

    test('privacy screen >', function(done) {
      setStepStateToIndex(8);
      var observer = new MutationObserver(function() {
        done(function() {
          observer.disconnect();
          assert.equal(UIManager.mainTitle.getAttribute('data-l10n-id'),
            'aboutBrowser');
        });
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });
  });

  suite('Dogfood Settings>', function() {
    const DOGFOODSETTING = 'debug.performance_data.dogfooding';
    var observerConfig = {
      attributes: true
    };

    setup(function() {
      // Needed to make sure that there is a DOM change to trigger
      // the MutationObserver.
      MockNavigatorSettings.mSyncRepliesOnly = true;

      setStepStateToIndex(1);
    });

    teardown(function() {
      MockNavigatorSettings.mSyncRepliesOnly = false;
    });

    test('metrics checkbox should disabled for dogfooders > ', function(done) {
      navigator.mozSettings.mSettings[DOGFOODSETTING] = true;
      setStepStateToIndex(7);

      var observer = new MutationObserver(function(records) {
        done(function () {
          MockNavigatorSettings.mReplyToRequests();
          observer.disconnect();
          var sharePerformance = document.getElementById('share-performance');
          assert.equal(sharePerformance.getAttribute('disabled'), 'true');
        });
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });

    test('metrics checkbox should be enabled for non dogfooders > ',
    function(done) {
      navigator.mozSettings.mSettings[DOGFOODSETTING] = false;
      setStepStateToIndex(7);

      var observer = new MutationObserver(function(records) {
        done(function () {
          MockNavigatorSettings.mReplyToRequests();
          observer.disconnect();
          var sharePerformance = document.getElementById('share-performance');
          assert.equal(sharePerformance.getAttribute('disabled'), null);
        });
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });
  });

  suite('SIM pin > ', function() {
    var cardStateChangeCallback = null;
    var handleCardStateStub = null;

    setup(function() {
      setStepStateToIndex(0);
      handleCardStateStub.reset();
    });

    teardown(function() {
    });

    suiteSetup(function() {
      handleCardStateStub = sinon.stub(SimManager, 'handleCardState',
        function(cb, skipUnlockScreen) {
          cardStateChangeCallback = cb;
        });
      sinon.stub(SimManager, 'available', function() {
        return true;
      });
    });

    suiteTeardown(function() {
      SimManager.handleCardState.restore();
      SimManager.available.restore();
    });

    test('with SIM card pin required', function() {
      MockIccHelper.setProperty('cardState', 'pinRequired');
      Navigation.forward();

      assert.equal(Navigation.previousStepIndex, 0);
      assert.equal(Navigation.currentStepIndex, 1);

      // Fire a cardstate change
      cardStateChangeCallback('ready');
      // Ensure we don't skip this current state
      assert.equal(Navigation.previousStepIndex, 0);
      assert.equal(Navigation.currentStepIndex, 1);

    });

    test('skip pin and go back', function() {
      MockIccHelper.setProperty('cardState', 'pinRequired');
      Navigation.forward();
      assert.equal(Navigation.previousStepIndex, 0);
      assert.equal(Navigation.currentStepIndex, 1);

      // Make sure we don't skip unlock screens on way forward.
      assert.isTrue(handleCardStateStub.calledWith(
        cardStateChangeCallback, false));

      // Skip step 2, sim pin entry
      Navigation.skipStep();
      Navigation.skipMobileDataScreen = true;
      assert.equal(Navigation.previousStepIndex, 0);
      assert.equal(Navigation.currentStepIndex, 2);

      // Go back
      Navigation.back();
      assert.equal(Navigation.previousStepIndex, 2);
      assert.equal(Navigation.currentStepIndex, 1);

      // Make sure we skip unlock screens going back.
      assert.isTrue(handleCardStateStub.calledWith(
        cardStateChangeCallback, true));
    });

    test('skip pin and go forward', function() {
      MockIccHelper.setProperty('cardState', 'pinRequired');
      Navigation.forward();

      assert.equal(Navigation.previousStepIndex, 0);
      assert.equal(Navigation.currentStepIndex, 1);

      // Make sure we don't skip unlock screens on way forward.
      assert.isTrue(handleCardStateStub.calledWith(
        cardStateChangeCallback, false));

      // Skip step 2, sim pin entry
      Navigation.skipStep();
      Navigation.skipMobileDataScreen = true;
      assert.equal(Navigation.previousStepIndex, 0);
      assert.equal(Navigation.currentStepIndex, 2);

      // Go forward
      Navigation.forward();
      assert.equal(Navigation.previousStepIndex, 2);
      assert.equal(Navigation.currentStepIndex, 3);
    });
  });

  suite('SIM mandatory', function() {
    var hash = '#SIM_mandatory';

    setup(function() {
      Navigation.simMandatory = true;
      setStepStateToIndex(0);
    });

    teardown(function() {
      Navigation.simMandatory = false;
    });

    test('without SIM card', function() {
      MockIccHelper.setProperty('cardState', null);
      Navigation.forward();

      assert.equal(Navigation.previousStepIndex, 0);
      assert.equal(Navigation.currentStepIndex, 1);
      assert.equal(window.location.hash, hash);

      Navigation.back();
      Navigation.forward();

      assert.equal(Navigation.previousStepIndex, 0);
      assert.equal(Navigation.currentStepIndex, 1);
      assert.equal(window.location.hash, hash);
    });

    test('with SIM card', function() {
      MockIccHelper.setProperty('cardState', 'ready');
      Navigation.forward();

      assert.equal(Navigation.previousStepIndex, 0);
      assert.equal(Navigation.currentStepIndex, 1);
      assert.equal(window.location.hash,
                   Navigation.stepAt(Navigation.currentStepIndex).hash);
    });

  });

  suite('external-url-loader >', function() {
    var link;

    setup(function() {
      this.sinon.stub(window, 'open');
      this.sinon.spy(UIManager, 'displayOfflineDialog');

      // load welcome page which has external link on it
      setStepStateToIndex(7);
      link = UIManager.activationScreen.querySelector('a.external');
    });

    test('handles external links when online', function() {
      navigator.onLine = true;
      link.click();

      assert.ok(window.open.called);
      assert.ok(window.open.calledWith(link.href));
    });

    test('shows an error when offline', function() {
      navigator.onLine = false;
      link.click();

      assert.isFalse(window.open.called);

      var title = link.title,
          href = link.href;

      assert.ok(UIManager.displayOfflineDialog.calledWith(href, title));
    });
  });
});
