'use strict';
/* global
  MockIccHelper,
  MockImportNavigationHTML,
  MockL10n,
  MockNavigatormozApps,
  MockNavigatorMozMobileConnections,
  MockNavigatorSettings,
  MocksHelper,
  MockOverlay,
  Navigation,
  numSteps,
  SimManager,
  steps,
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
requireApp('ftu/test/unit/mock_overlay.js');
requireApp('ftu/test/unit/mock_operatorVariant.js');
requireApp('ftu/test/unit/mock_navigation.html.js');

var mocksHelperForNavigation = new MocksHelper([
  'Overlay',
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
      realSettings,
      realHTML,
      realOverlay;

  function navigatorOnLine() {
    return isOnLine;
  }

  function setNavigatorOnLine(value) {
    isOnLine = value;
  }

  suiteSetup(function() {

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    realOverlay = window.Overlay;
    window.Overlay = MockOverlay;

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

    window.Overlay = realOverlay;
    realOverlay = null;

    if (realOnLine) {
      Object.defineProperty(navigator, 'onLine', realOnLine);
    } else {
      delete navigator.onLine;
    }
  });

  var setStepState = function(current, callback) {
    Navigation.currentStep = current;
    Navigation.previousStep = current != 1 ? current - 1 : 1;
    Navigation.manageStep(callback);
  };


  setup(function() {
    realHTML = document.body.innerHTML;
    document.body.innerHTML = MockImportNavigationHTML;
  });

  // The mocks need the HTML markup
  mocksHelperForNavigation.attachTestHelpers();

  // Navigation.init needs the mocks
  setup(function() {
    Navigation.init();
    this.sinon.stub(Navigation, 'postStepMessage');
  });

  teardown(function() {
    document.body.innerHTML = realHTML;
    realHTML = null;
    Navigation.simMandatory = false;
    window.removeEventListener('hashchange', Navigation);
  });

  test('navigates forward', function() {
    MockIccHelper.setProperty('cardState', 'ready');
    Navigation.simMandatory = true;
    Navigation.totalSteps = numSteps; // explicitly set the total steps

    setStepState(1);
    for (var i = Navigation.currentStep; i < numSteps; i++) {
      Navigation.forward();
      assert.equal(Navigation.previousStep, i);
      assert.equal(Navigation.currentStep, (i + 1));
      assert.equal(window.location.hash, steps[(i + 1)].hash);
      assert.isTrue(Navigation.postStepMessage.calledWith(i));
    }
  });

  test('navigates backwards', function() {
    MockIccHelper.setProperty('cardState', 'ready');
    Navigation.simMandatory = true;
    Navigation.totalSteps = numSteps; // explicitly set the total steps

    setStepState(numSteps);
    // The second step isn't mandatory.
    for (var i = Navigation.currentStep; i > 2; i--) {
      Navigation.back();
      assert.equal(Navigation.previousStep, i);
      assert.equal(Navigation.currentStep, i - 1);
      assert.equal(window.location.hash, steps[i - 1].hash);
    }
  });

  test('skips date and time when network time is available', function() {
    var oldTimeZoneNeedsConfirmation = UIManager.timeZoneNeedsConfirmation;
    UIManager.timeZoneNeedsConfirmation = false;
    UIManager.updateSetting = sinon.stub();

    MockIccHelper.setProperty('cardState', 'ready');
    Navigation.simMandatory = true;
    Navigation.totalSteps = numSteps; // explicitly set the total steps

    setStepState(3);
    Navigation.forward();
    assert.equal(Navigation.previousStep, 3);
    assert.equal(Navigation.currentStep, 5);
    assert.equal(window.location.hash, steps[5].hash);
    // Make sure we posted both steps.
    assert.isTrue(Navigation.postStepMessage.callCount > 1);

    UIManager.timeZoneNeedsConfirmation = oldTimeZoneNeedsConfirmation;
  });

  test('last step launches tutorial', function() {
    Navigation.currentStep = numSteps;
    window.location.hash = steps[Navigation.currentStep].hash;
    UIManager.activationScreen.classList.add('show');

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
      setStepState(1);
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
      setStepState(2);
      var observer = new MutationObserver(function() {
        done(function() {
          observer.disconnect();
          assert.equal(UIManager.mainTitle.getAttribute('data-l10n-id'), '3g');
        });
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });

    test('wifi screen >', function(done) {
      setStepState(3);
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
      setStepState(4);
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
      setStepState(5);
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
      setStepState(6);
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
      setStepState(7);
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
      setStepState(8);
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
      setStepState(9);
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

      setStepState(1);
    });

    teardown(function() {
      MockNavigatorSettings.mSyncRepliesOnly = false;
    });

    test('metrics checkbox should disabled for dogfooders > ', function(done) {
      navigator.mozSettings.mSettings[DOGFOODSETTING] = true;
      setStepState(8);

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
      setStepState(8);

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
      setStepState(1);
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

      assert.equal(Navigation.previousStep, 1);
      assert.equal(Navigation.currentStep, 2);

      // Fire a cardstate change
      cardStateChangeCallback('ready');
      // Ensure we don't skip this current state
      assert.equal(Navigation.previousStep, 1);
      assert.equal(Navigation.currentStep, 2);

    });

    test('skip pin and go back', function() {
      MockIccHelper.setProperty('cardState', 'pinRequired');
      Navigation.forward();

      assert.equal(Navigation.previousStep, 1);
      assert.equal(Navigation.currentStep, 2);

      // Make sure we don't skip unlock screens on way forward.
      assert.isTrue(handleCardStateStub.calledWith(
        cardStateChangeCallback, false));

      // Skip step 2, sim pin entry
      Navigation.skipStep();
      Navigation.skipMobileDataScreen = true;
      assert.equal(Navigation.previousStep, 1);
      assert.equal(Navigation.currentStep, 3);

      // Go back
      Navigation.back();
      assert.equal(Navigation.previousStep, 3);
      assert.equal(Navigation.currentStep, 2);

      // Make sure we skip unlock screens going back.
      assert.isTrue(handleCardStateStub.calledWith(
        cardStateChangeCallback, true));
    });

    test('skip pin and go forward', function() {
      MockIccHelper.setProperty('cardState', 'pinRequired');
      Navigation.forward();

      assert.equal(Navigation.previousStep, 1);
      assert.equal(Navigation.currentStep, 2);

      // Make sure we don't skip unlock screens on way forward.
      assert.isTrue(handleCardStateStub.calledWith(
        cardStateChangeCallback, false));

      // Skip step 2, sim pin entry
      Navigation.skipStep();
      Navigation.skipMobileDataScreen = true;
      assert.equal(Navigation.previousStep, 1);
      assert.equal(Navigation.currentStep, 3);

      // Go forward
      Navigation.forward();
      assert.equal(Navigation.previousStep, 3);
      assert.equal(Navigation.currentStep, 4);
    });
  });

  suite('SIM mandatory', function() {
    var hash = '#SIM_mandatory';

    setup(function() {
      Navigation.simMandatory = true;
      setStepState(1);
    });

    teardown(function() {
      Navigation.simMandatory = false;
    });

    test('without SIM card', function() {
      MockIccHelper.setProperty('cardState', null);
      Navigation.forward();

      assert.equal(Navigation.previousStep, 1);
      assert.equal(Navigation.currentStep, 2);
      assert.equal(window.location.hash, hash);

      Navigation.back();
      Navigation.forward();

      assert.equal(Navigation.previousStep, 1);
      assert.equal(Navigation.currentStep, 2);
      assert.equal(window.location.hash, hash);
    });

    test('with SIM card', function() {
      MockIccHelper.setProperty('cardState', 'ready');
      Navigation.forward();

      assert.equal(Navigation.previousStep, 1);
      assert.equal(Navigation.currentStep, 2);
      assert.equal(window.location.hash, steps[Navigation.currentStep].hash);
    });

  });

  suite('external-url-loader >', function() {
    var link;

    setup(function() {
      this.sinon.stub(window, 'open');
      this.sinon.spy(UIManager, 'displayOfflineDialog');

      Navigation.currentStep = 2;
      window.location.hash = steps[Navigation.currentStep].hash;

      link = document.querySelector('a.external');
    });

    test('handles external links when online', function() {
      navigator.onLine = true;
      link.click();

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
