'use strict';

requireApp('communications/ftu/js/navigation.js');

requireApp('communications/ftu/test/unit/mock_l10n.js');
requireApp('communications/ftu/test/unit/mock_wifi_manager.js');
requireApp('communications/ftu/test/unit/mock_data_mobile.js');
requireApp('communications/ftu/test/unit/mock_sim_manager.js');
requireApp('communications/ftu/test/unit/mock_sd_manager.js');
requireApp('communications/ftu/test/unit/mock_import_services.js');
requireApp('communications/ftu/test/unit/mock_ui_manager.js');
requireApp('communications/ftu/test/unit/mock_tutorial.js');
requireApp('communications/ftu/test/unit/mock_wifi_manager.js');
requireApp('communications/ftu/test/unit/mock_utils.js');
requireApp('communications/ftu/test/unit/mock_operatorVariant.js');
requireApp(
    'communications/ftu/test/unit/mock_navigator_moz_mobile_connection.js');

requireApp('communications/shared/test/unit/mocks/mock_icc_helper.js');
requireApp(
    'communications/shared/test/unit/mocks/mock_navigator_moz_settings.js');

requireApp('communications/ftu/test/unit/mock_navigation.html.js');

mocha.globals(['open']);

var _;
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
  var mocksHelper = mocksHelperForNavigation;
  var isOnLine = true;
  var container, progressBar;
  var realOnLine,
      realL10n,
      realMozMobileConnection,
      realSettings,
      realHTML;

  function navigatorOnLine() {
    return isOnLine;
  }

  function setNavigatorOnLine(value) {
    isOnLine = value;
  }

  suiteSetup(function() {
    realHTML = document.body.innerHTML;
    document.body.innerHTML = MockImportNavigationHTML;

    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnection = MockNavigatorMozMobileConnection;

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

    mocksHelper.suiteSetup();
    Navigation.init();
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();

    document.body.innerHTML = realHTML;
    realHTML = null;

    navigator.mozMobileConnection = realMozMobileConnection;
    realMozMobileConnection = null;

    navigator.mozSettings = realSettings;
    realSettings = null;

    navigator.mozL10n = realL10n;
    realL10n = null;

    if (realOnLine) {
      Object.defineProperty(navigator, 'onLine', realOnLine);
    }
  });

  var setStepState = function(current, callback) {
    Navigation.currentStep = Navigation.previousStep = current;
    Navigation.manageStep(callback);
  };

  test('navigates forward', function() {
    setStepState(1);
    for (var i = Navigation.currentStep; i < numSteps; i++) {
      Navigation.forward();
      assert.equal(Navigation.previousStep, i);
      assert.equal(Navigation.currentStep, (i + 1));
      assert.equal(window.location.hash, steps[(i + 1)].hash);
    }
  });

  test('navigates backwards', function() {
    setStepState(numSteps);
    // The second step isn't mandatory.
    for (var i = Navigation.currentStep; i > 2; i--) {
      Navigation.back();
      assert.equal(Navigation.previousStep, i);
      assert.equal(Navigation.currentStep, i - 1);
      assert.equal(window.location.hash, steps[i - 1].hash);
    }
  });

  test('last step launches tutorial', function() {
    Navigation.currentStep = numSteps;
    window.location.hash = steps[Navigation.currentStep].hash;
    UIManager.activationScreen.classList.add('show');

    Navigation.forward();
    assert.include(UIManager.finishScreen.classList, 'show');
    assert.isFalse(UIManager.activationScreen.classList.contains('show'));
  });

  suite('UI changes>', function() {
    var observerConfig = {
      childList: true
    };

    setup(function() {
      MockIccHelper.setProperty('cardstate', 'ready');
      Navigation.simMandatory = false;
    });

    test('languages screen >', function(done) {
      setStepState(1);
      var observer = new MutationObserver(function() {
        observer.disconnect();
        assert.equal(UIManager.mainTitle.innerHTML, _('language'));
        done();
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });

    test('data mobile screen >', function(done) {
      setStepState(2);
      var observer = new MutationObserver(function() {
        observer.disconnect();
        assert.equal(UIManager.mainTitle.innerHTML, _('3g'));
        done();
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });

    test('wifi screen >', function(done) {
      setStepState(3);
      var observer = new MutationObserver(function() {
        observer.disconnect();
        assert.equal(UIManager.mainTitle.innerHTML, _('selectNetwork'));
        assert.isFalse(UIManager.navBar.classList.contains('secondary-menu'));
        assert.isFalse(UIManager.activationScreen.classList.contains(
                       'no-options'));
        done();
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });

    test('date&time screen >', function(done) {
      setStepState(4);
      var observer = new MutationObserver(function() {
        observer.disconnect();
        assert.equal(UIManager.mainTitle.innerHTML, _('dateAndTime'));
        done();
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });

    test('geolocation screen >', function(done) {
      setStepState(5);
      var observer = new MutationObserver(function() {
        observer.disconnect();
        assert.equal(UIManager.mainTitle.innerHTML, _('geolocation'));
        done();
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });

    test('import contacts screen >', function(done) {
      setStepState(6);
      var observer = new MutationObserver(function() {
        observer.disconnect();
        assert.equal(UIManager.mainTitle.innerHTML, _('importContacts3'));
        done();
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });

    test('welcome screen >', function(done) {
      setStepState(7);
      var observer = new MutationObserver(function() {
        observer.disconnect();
        assert.equal(UIManager.mainTitle.innerHTML, _('aboutBrowser'));
        done();
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });

    test('privacy screen >', function(done) {
      setStepState(8);
      var observer = new MutationObserver(function() {
        observer.disconnect();
        assert.equal(UIManager.mainTitle.innerHTML, _('aboutBrowser'));
        done();
      });
      observer.observe(UIManager.mainTitle, observerConfig);
    });
  });


  suite('SIM pin > ', function() {
    var cardStateChangeCallback = null;

    setup(function() {
      setStepState(1);
    });

    teardown(function() {
    });

    suiteSetup(function() {
      sinon.stub(SimManager, 'handleCardState', function(cb) {
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

      // Skip step 2, sim pin entry
      Navigation.skipStep();
      assert.equal(Navigation.currentStep, 3);

      // Go back
      Navigation.back();
      assert.equal(Navigation.currentStep, 2);
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
