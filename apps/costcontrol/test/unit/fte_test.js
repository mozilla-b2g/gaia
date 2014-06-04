/* global MockCommon, AutoSettings, MockLazyLoader, MockConfigManager,
          MocksHelper, SimManager
*/
'use strict';

require('/test/unit/mock_moz_l10n.js');
require('/test/unit/mock_config_manager.js');
require('/test/unit/mock_debug.js');
require('/js/utils/toolkit.js');
require('/test/unit/mock_common.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/js/views/BalanceLowLimitView.js');
require('/js/settings/limitdialog.js');
require('/js/utils/formatting.js');
require('/js/view_manager.js');
require('/js/settings/autosettings.js');
require('/js/sim_manager.js');
require('/js/fte.js');

var realMozL10n;

if (!window.navigator.mozL10n) {
  window.navigator.mozL10n = null;
}

var MocksHelperForUnitTest = new MocksHelper([
  'ConfigManager',
  'Common',
  'LazyLoader'
]).init();

suite('FTE Test Suite >', function() {

  MocksHelperForUnitTest.attachTestHelpers();

  var fteWizard;
  suiteSetup(function() {
    window.Common = new MockCommon();

    realMozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = window.MockMozL10n;

    sinon.stub(SimManager, 'requestDataSimIcc', function(callback) {
      (typeof callback === 'function') && callback({});
    });
    sinon.stub(SimManager, 'isMultiSim').returns(false);
  });

  teardown(function() {
    window.location.hash = '';
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realMozL10n;
    SimManager.requestDataSimIcc.restore();
    SimManager.isMultiSim.restore();
  });

  function setupApplicationMode(applicationMode, fakeConfiguration) {
    loadBodyHTML('/fte.html#' + applicationMode);
    fteWizard = document.getElementById('firsttime-view');
    window.ConfigManager = new MockConfigManager({
      fakeConfiguration: fakeConfiguration,
      fakeSettings: {
        fte: true,
        dataLimitValue: 40,
        dataLimitUnit: 'MB',
        lowLimit: true
      },
      applicationMode: applicationMode
    });
  }

  function setupPrepaidMode() {
    var fakeConfiguration = {
      default_low_limit_threshold: 3,
      credit: { currency: 'R$' }
    };
    setupApplicationMode('PREPAID', fakeConfiguration);
  }

  function setupPostPaidMode() {
    var fakeConfiguration = {};
    setupApplicationMode('POSTPAID', fakeConfiguration);
  }

  function setupDataUsageOnlyMode() {
    var fakeConfiguration = {
    };
    setupApplicationMode('DATA_USAGE_ONLY', fakeConfiguration);
  }

  // The only way to detect when the FTE loading has finished is wrapping the
  // load method of Lazyloader (when is called with costcontrol library) with a
  // stub function. For this reason, replacing the original method for the
  // assert functions of the test.
  function assetWhenFTEIsFinished(assertingFunction, done) {
    var autoSettingsSpy = sinon.spy(AutoSettings, 'initialize');
    function testTeardown() {
      autoSettingsSpy.restore();
      MockLazyLoader.load.restore();

      done();
    }

    sinon.stub(MockLazyLoader, 'load', function(fileArray, callback) {
      if (fileArray[0] !== 'js/costcontrol.js') {
        (typeof callback === 'function') && callback();
      } else {
        if (typeof assertingFunction === 'function') {
          assertingFunction(autoSettingsSpy, testTeardown);
        }
      }
    });
  }

  function assertDataUsageOnlyInit(autoSettingsSpy, testTeardown) {
    assert.equal(fteWizard.dataset.steps, 3);
    assert.equal(autoSettingsSpy.getCall(0).args[2], '#non-vivo-step-1');
    testTeardown();
  }

  function assertNoDataUsageOnlyInit(autoSettingsSpy, testTeardown) {
    assert.equal(fteWizard.dataset.steps, 4);
    assert.ok(autoSettingsSpy.calledOnce);
    assert.equal(autoSettingsSpy.getCall(0).args[2], '#step-1');
    assert.ok(document.getElementById('to-step-2').disabled);

    testTeardown();
  }

  function assertNavigationForward(autoSettingsSpy, testTeardown,
                                   stepsForward) {
    var currentScreen =
      document.querySelector('[role=region]:not([data-viewport])');
    stepsForward.forEach(function(step) {
      var buttonNext = currentScreen.querySelector('[data-navigation=next]');
      if (buttonNext) {
        triggerEvent(buttonNext, 'click');
      }
      // update currentScreen after press button next
      currentScreen =
        document.querySelector('[role=region]:not([data-viewport])');

      assert.equal(currentScreen.id, step);
    });

    (typeof testTeardown === 'function') && testTeardown();
  }

  function assertNavigationBackward(autoSettingsSpy, testTeardown,
                                   stepsBackward) {
    var currentScreen =
      document.querySelector('[role=region]:not([data-viewport])');
    stepsBackward.forEach(function(step) {
      var buttonBack = currentScreen.querySelector('[data-navigation=back]');
      if (buttonBack) {
        triggerEvent(buttonBack, 'click');
      }

      // update currentScreen after press button next
      currentScreen =
        document.querySelector('[role=region]:not([data-viewport])');
      assert.equal(currentScreen.id, step);
    });

    (typeof testTeardown === 'function') && testTeardown();
  }

  function assertDataUsageOnlyNavigationForward(autoSettingsSpy, testTeardown) {
    var dataStepsForward = ['non-vivo-step-1', 'non-vivo-step-2'];
    assertNavigationForward(autoSettingsSpy, testTeardown, dataStepsForward);
  }

  function assertDataUsageOnlyNavigationBackward(autoSettingsSpy,
                                                 testTeardown) {
    var dataStepsForward = ['non-vivo-step-1', 'non-vivo-step-2'];
    assertNavigationForward(autoSettingsSpy, null, dataStepsForward);

    var dataStepsBackward = ['non-vivo-step-1', 'step-1'];
    assertNavigationBackward(autoSettingsSpy, testTeardown, dataStepsBackward);
  }

  function assertPrepaidNavigationForward(autoSettingsSpy, testTeardown) {
    var prepaidStepsForward = ['prepaid-step-2', 'prepaid-step-3'];
    var currentScreen = document.getElementById('step-1');
    var buttonNext = currentScreen.querySelector('[data-navigation=next]');
    triggerEvent(buttonNext, 'click');

    assert.isTrue(document.getElementById('to-step-2').disabled);
    triggerEvent(document.getElementById('prepaid-plan'), 'click');
    assert.isFalse(document.getElementById('to-step-2').disabled);
    document.getElementById('low-limit-input').value = 40;

    assertNavigationForward(autoSettingsSpy, testTeardown, prepaidStepsForward);
  }

  function assertPostpaidNavigationForward(autoSettingsSpy, testTeardown) {
    var postpaidStepsForward = ['postpaid-step-2', 'postpaid-step-3'];
    var currentScreen = document.getElementById('step-1');
    var buttonNext = currentScreen.querySelector('[data-navigation=next]');
    triggerEvent(buttonNext, 'click');

    assert.isTrue(document.getElementById('to-step-2').disabled);
    triggerEvent(document.getElementById('postpaid-plan'), 'click');
    assert.isFalse(document.getElementById('to-step-2').disabled);
    document.getElementById('low-limit-input').value = 40;

    assertNavigationForward(autoSettingsSpy, testTeardown,
                            postpaidStepsForward);
  }

  function triggerEvent(element, eventName) {
    var event = document.createEvent('HTMLEvents');
      event.initEvent(eventName, true, true);
      element.dispatchEvent(event);
  }

  function initFTE() {
    var event = new CustomEvent('DOMContentLoaded');
    window.dispatchEvent(event);
  }

  test('DATA_USAGE_ONLY mode initialized correctly', function(done) {
    setupDataUsageOnlyMode();
    assetWhenFTEIsFinished(assertDataUsageOnlyInit, done);

    initFTE();
  });

  test('PREPAID mode initialized correctly', function(done) {
    setupPrepaidMode();
    assetWhenFTEIsFinished(assertNoDataUsageOnlyInit, done);

    initFTE();
  });

  test('POSTPAID mode initialized correctly', function(done) {
    setupPostPaidMode();
    assetWhenFTEIsFinished(assertNoDataUsageOnlyInit, done);

    initFTE();
  });

  test('DATA_USAGE_ONLY mode navigates forward', function(done) {
    setupDataUsageOnlyMode();
    assetWhenFTEIsFinished(assertDataUsageOnlyNavigationForward, done);

    initFTE();
  });

  test('DATA_USAGE_ONLY mode navigates backward', function(done) {
    setupDataUsageOnlyMode();
    assetWhenFTEIsFinished(assertDataUsageOnlyNavigationBackward, done);

    initFTE();
  });

  test('PREPAID mode navigates forward', function(done) {
    setupPrepaidMode();
    assetWhenFTEIsFinished(assertPrepaidNavigationForward, done);

    initFTE();
  });

  test('POSTPAID mode navigates forward', function(done) {
    setupPostPaidMode();
    assetWhenFTEIsFinished(assertPostpaidNavigationForward, done);

    initFTE();
  });



});
