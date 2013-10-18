'use strict';

requireApp('communications/ftu/test/unit/mock_l10n.js');
requireApp(
    'communications/ftu/test/unit/mock_navigator_moz_mobile_connection.js');
requireApp('communications/ftu/test/unit/mock_navigator_moz_settings.js');
requireApp('communications/ftu/test/unit/mock_data_mobile.js');
requireApp('communications/ftu/test/unit/mock_sim_manager.js');
requireApp('communications/ftu/test/unit/mock_ui_manager.js');
requireApp('communications/ftu/test/unit/mock_tutorial.js');
requireApp('communications/ftu/test/unit/mock_wifi_manager.js');
requireApp('communications/ftu/test/unit/mock_utils.js');
requireApp('communications/ftu/test/unit/mock_operatorVariant.js');
requireApp('communications/ftu/js/navigation.js');

requireApp('communications/shared/test/unit/mocks/mock_icc_helper.js');

mocha.globals(['open']);

var _;
var mocksHelperForNavigation = new MocksHelper([
  'UIManager',
  'SimManager',
  'DataMobile',
  'OperatorVariant',
  'IccHelper',
  'Tutorial'

]);
mocksHelperForNavigation.init();

suite('navigation >', function() {
  var mocksHelper = mocksHelperForNavigation;
  var isOnLine = true;
  var container, progressBar;
  var realOnLine,
      realL10n,
      realMozMobileConnection,
      realSettings;

  function navigatorOnLine() {
    return isOnLine;
  }

  function setNavigatorOnLine(value) {
    isOnLine = value;
  }

  function createDOM() {
    var markup =
    '<header>' +
    ' <menu type="toolbar">' +
    '   <button id="wifi-refresh-button" data-l10n-id="refresh">' +
    '     Refresh' +
    '   </button>' +
    ' </menu>' +
    ' <h1 id="main-title"></h1>' +
    '</header>' +
    '<ol id="progress-bar" class="step-state">' +
    '</ol>' +
    '<section id="unlock-sim-screen"' +
    ' role="region" class="skin-organic">' +
    ' <nav role="navigation">' +
    ' <button id="skip-pin-button" class="button-left" data-l10n-id="skip">' +
    'Skip</button>' +
    ' <button id="back-sim-button" class="button-left back hidden" ' +
    '   data-l10n-id="back">' +
    '     Back' +
    '  </button>' +
    '<button id="unlock-sim-button" class="recommend" data-l10n-id="send">' +
    'Send</button></nav>' +
    '</section>' +
    '<section id="activation-screen"' +
    ' role="region" class="skin-organic no-options">' +
    ' <menu role="navigation" id="nav-bar" class="forward-only">' +
    '   <button id="back" class="button-left back">' +
    '     Back' +
    '     <span></span>' +
    '   </button>' +
    '   <button class="recommend forward" id="forward">' +
    '     Next' +
    '     <span></span>' +
    '   </button>' +
    '   <button class="recommend" id="wifi-join-button">' +
    '     Join' +
    '   </button>' +
    ' </menu>' +
    ' <a href="https://www.mozilla.org/privacy/firefox-os/"' +
    '    class="external" title="URL title">url text</a>' +
    '</section>' +
    '<section id="finish-screen" role="region">' +
    '</section>' +
    '<section id="tutorial-screen" role="region">' +
    '</section>';

    container = document.createElement('div');
    container.insertAdjacentHTML('beforeend', markup);
    document.body.appendChild(container);
  }

  setup(function() {
    createDOM();

    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnection = MockNavigatorMozMobileConnection;

    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    realOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: navigatorOnLine,
      set: setNavigatorOnLine
    });
    MockIccHelper.setProperty('cardState', 'ready');

    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    mocksHelper.setup();
    Navigation.init();
  });

  teardown(function() {
    navigator.mozSettings = realSettings;
    realSettings = null;
    mocksHelper.teardown();
    container.parentNode.removeChild(container);

    navigator.mozMobileConnection = realMozMobileConnection;
    realMozMobileConnection = null;

    navigator.mozL10n = realL10n;
    realL10n = null;

    if (realOnLine) {
      Object.defineProperty(navigator, 'onLine', realOnLine);
    }
  });

  suiteSetup(function() {
    mocksHelper.suiteSetup();
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
  });

  test('navigates forward', function() {
    // The second step isn't mandatory.
    Navigation.forward();
    for (var i = Navigation.currentStep; i < numSteps; i++) {
      Navigation.forward();
      assert.equal(Navigation.previousStep, i);
      assert.equal(Navigation.currentStep, (i + 1));
      assert.equal(window.location.hash, steps[(i + 1)].hash);
    }
  });

  test('navigates backwards', function() {
    Navigation.currentStep = numSteps;
    Navigation.previousStep = numSteps;
    window.location.hash = steps[Navigation.currentStep].hash;
    // The second step isn't mandatory.
    for (var i = Navigation.currentStep; i > 2; i--) {
      Navigation.back();
      assert.equal(Navigation.previousStep, i);
      assert.equal(Navigation.currentStep, i - 1);
      assert.equal(window.location.hash, steps[i - 1].hash);
    }
  });

  test('navigate loop with SIMMandatory', function() {
    Navigation.simMandatory = true;
    MockIccHelper.setProperty('cardState', 'absent');
    Navigation.currentStep = 1;
    Navigation.previousStep = 1;
    Navigation.forward();

    assert.equal(Navigation.previousStep, 1);
    assert.equal(Navigation.currentStep, 2);
    assert.equal(window.location.hash, '#SIM_mandatory');

    Navigation.back();
    Navigation.forward();

    assert.equal(Navigation.previousStep, 1);
    assert.equal(Navigation.currentStep, 2);
    assert.equal(window.location.hash, '#SIM_mandatory');
  });

  test('navigate SIMMandatory with SIM', function() {
    Navigation.simMandatory = true;
    MockIccHelper.setProperty('cardState', 'ready');
    Navigation.currentStep = 1;
    Navigation.previousStep = 1;
    Navigation.forward();

    assert.equal(Navigation.previousStep, 1);
    assert.equal(Navigation.currentStep, 2);
    assert.equal(window.location.hash, steps[Navigation.currentStep].hash);
  });

  test('last step launches tutorial', function() {
    Navigation.currentStep = numSteps;
    window.location.hash = steps[Navigation.currentStep].hash;
    UIManager.activationScreen.classList.add('show');

    Navigation.forward();
    assert.include(UIManager.finishScreen.classList, 'show');
    assert.isFalse(UIManager.activationScreen.classList.contains('show'));
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
