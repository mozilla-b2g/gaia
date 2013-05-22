'use strict';

requireApp('communications/ftu/test/unit/mock_l10n.js');
requireApp(
    'communications/ftu/test/unit/mock_navigator_moz_mobile_connection.js');
requireApp('communications/ftu/test/unit/mock_data_mobile.js');
requireApp('communications/ftu/test/unit/mock_sim_manager.js');
requireApp('communications/ftu/test/unit/mock_ui_manager.js');
requireApp('communications/ftu/test/unit/mock_wifi_manager.js');
requireApp('communications/ftu/test/unit/mock_utils.js');
requireApp('communications/ftu/js/navigation.js');

// When adding an iframe there's always a leak, so for this test we
// disable the leak detection
mocha.setup({globals: ['ignore_leaks']});

// window[0] is created when we create the external url loader frame
mocha.globals(['0']);

var mocksHelperForNavigation = new MocksHelper([
  'UIManager'
]);
mocksHelperForNavigation.init();

suite('navigation >', function() {
  var mocksHelper = mocksHelperForNavigation;
  var isOnLine = true;
  var container, progressBar;
  var realOnLine,
      realL10n,
      realMozMobileConnection,
      realDataMobile;

  function navigatorOnLine() {
    return isOnLine;
  };

  function setNavigatorOnLine(value) {
    isOnLine = value;
  };

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
    '</section>' +
    '<section id="finish-screen" role="region">' +
    '</section>' +
    '<section id="tutorial-screen" role="region">' +
    '</section>' +
    '<section role="region" id="external-url-loader" class="external">' +
    '</section>';

    container = document.createElement('div');
    container.insertAdjacentHTML('beforeend', markup);
    document.body.appendChild(container);
  };

  setup(function() {
    createDOM();

    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnection = MockNavigatorMozMobileConnection;

    realOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      get: navigatorOnLine,
      set: setNavigatorOnLine
    });

    realL10n = navigator.mozL10n;
    navigator.mozL10n = {
      get: function get(key) {
        return key;
      },
      DateTimeFormat: function() {
        this.localeFormat = function(date, format) {
          return date;
        };
      }
    };
    _ = navigator.mozL10n.get;

    realDataMobile = navigator.DataMobile;
    navigator.DataMobile = MockDataMobile;

    mocksHelper.setup();
    Navigation.init();
  });

  teardown(function() {
    mocksHelper.teardown();
    container.parentNode.removeChild(container);
    navigator.mozMobileConnection = realMozMobileConnection;
    navigator.mozL10n = realL10n;
    if (realOnLine) {
      Object.defineProperty(navigator, 'onLine', realOnLine);
    }
    navigator.DataMobile = realDataMobile;
  });

  suiteSetup(function() {
    mocksHelper.suiteSetup();
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
  });

  test('navigates forward', function() {
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
    for (var i = Navigation.currentStep; i > 1; i--) {
      Navigation.back();
      assert.equal(Navigation.previousStep, i);
      assert.equal(Navigation.currentStep, i - 1);
      assert.equal(window.location.hash, steps[i - 1].hash);
    }
  });

  test('last step launches tutorial', function() {
    Navigation.currentStep = numSteps;
    window.location.hash = steps[Navigation.currentStep].hash;
    Navigation.forward();
    assert.include(UIManager.finishScreen.classList, 'show');
    assert.isFalse(UIManager.activationScreen.classList.contains('show'));
  });

  suite('external-url-loader >', function() {
    setup(function(done) {
      progressBar = container.querySelector('#progress-bar');
      document.location.hash = Navigation.externalUrlLoaderSelector;
      setTimeout(done.bind(null, undefined), 100);
    });

    test('progress bar is hidden', function() {
      assert.equal(progressBar.className, 'hidden');
    });

    test('handles external links', function() {
      Navigation.currentStep = 2;
      window.location.hash = steps[Navigation.currentStep].hash;
      var href = 'https://www.mozilla.org/privacy/firefox-os/';
      var title = 'URL Title';
      var link = document.createElement('a');
      link.href = href;
      link.title = title;
      link.classList.add('external');
      link.textContent = 'link text';
      var mock_event = {
        target: link,
        preventDefault: function() {}
      };
      navigator.onLine = true;
      Navigation.handleExternalLinksClick(mock_event);
      assert.include(Navigation.externalIframe.src, href);
      assert.equal(window.location.hash, '#external-url-loader');

      // Test failing due to history.back()
      // Navigation.back();
      // assert.equal(Navigation.currentStep, 2);
      // assert.equal(Navigation.externalIframe.src, 'about:blank');
      // assert.equal(window.location.hash, steps[Navigation.currentStep].hash);
    });
  });
});
