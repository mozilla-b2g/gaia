/* global Settings, ConfigManager, Formatting, MocksHelper, MockCommon,
          MockConfigManager, MockCostControl, SimManager
*/
'use strict';

require('/test/unit/mock_date.js');
require('/test/unit/mock_moz_l10n.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
require('/test/unit/mock_debug.js');
require('/test/unit/mock_common.js');
require('/shared/test/unit/load_body_html_helper.js');
require('/js/view_manager.js');
require('/js/views/BalanceView.js');
require('/test/unit/mock_cost_control.js');
require('/test/unit/mock_config_manager.js');
require('/js/utils/formatting.js');
require('/js/views/BalanceLowLimitView.js');
require('/js/views/ResetMenuDialog.js');
require('/js/views/ConfirmDialog.js');
require('/js/settings/limitdialog.js');
require('/js/settings/autosettings.js');
require('/js/settings/settings.js');
require('/js/sim_manager.js');
require('/js/utils/toolkit.js');
require('/shared/js/component_utils.js');
require('/shared/elements/gaia-header/dist/gaia-header.js');
require('/shared/elements/gaia_subheader/script.js');

var realMozL10n,
    realAddNetworkUsageAlarm,
    realDate;

if (!window.navigator.mozL10n) {
  window.navigator.mozL10n = null;
}

if (!window.realAddNetworkUsageAlarm) {
  window.realAddNetworkUsageAlarm = null;
}


var MocksHelperForUnitTest = new MocksHelper([
  'LazyLoader',
  'Common',
  'CostControl',
  'ConfigManager'
]).init();


suite('Settings Test Suite >', function() {

  MocksHelperForUnitTest.attachTestHelpers();

  var mobileUsage, wifiUsage;

  var domSelectorsForLayout = [
    {
      name: 'planTypeSelector',
      selector: '#plantype-settings',
      isHiddenOnPostpaidLayout: false,
      isHiddenOnPrepaidLayout: false,
      isHiddenOnDataUsageOnlyLayout: true
    }, {
      name: 'phoneActivitySettings',
      selector: '#phone-activity-settings + .settings',
      isHiddenOnPostpaidLayout: false,
      isHiddenOnPrepaidLayout: true,
      isHiddenOnDataUsageOnlyLayout: true
    }, {
      name: 'phoneActivityTitle',
      selector: '#phone-activity-settings',
      isHiddenOnPostpaidLayout: false,
      isHiddenOnPrepaidLayout: true,
      isHiddenOnDataUsageOnlyLayout: true
    }, {
      name: 'balanceTitle',
      selector: '#balance-settings',
      isHiddenOnPostpaidLayout: true,
      isHiddenOnPrepaidLayout: false,
      isHiddenOnDataUsageOnlyLayout: true
    }, {
      name: 'balanceSettings',
      selector: '#balance-settings + .settings',
      isHiddenOnPostpaidLayout: true,
      isHiddenOnPrepaidLayout: false,
      isHiddenOnDataUsageOnlyLayout: true
    }, {
      name: 'reportsTitle',
      selector: '#phone-internet-settings',
      isHiddenOnPostpaidLayout: false,
      isHiddenOnPrepaidLayout: true,
      isHiddenOnDataUsageOnlyLayout: false
    }
  ];

  suiteSetup(function() {
    window.Common = new MockCommon();

    realMozL10n = window.navigator.mozL10n;
    window.navigator.mozL10n = window.MockMozL10n;

    realAddNetworkUsageAlarm = window.addNetworkUsageAlarm;
    window.addNetworkUsageAlarm = function() {};

    realDate = window.Date;
  });

  setup(function() {
    var now = new Date(2014, 5, 24); // 2014-06-24
    window.Date = new window.MockDateFactory(now);
    loadBodyHTML('/settings.html');

    // Data usage elements
    mobileUsage = document.querySelector('#mobile-data-usage > span');
    wifiUsage = document.querySelector('#wifi-data-usage > span');
  });

  teardown(function() {
    window.Date = realDate;
    window.location.hash = '';
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realMozL10n;
    window.addNetworkUsageAlarm = realAddNetworkUsageAlarm;
  });

  function setupApplicationMode(applicationMode, fakeConfiguration) {
    window.ConfigManager = new MockConfigManager({
      fakeConfiguration: fakeConfiguration,
      fakeSettings: {
        dataLimit: true,
        dataLimitValue: 40,
        dataLimitUnit: 'MB',
        lowLimit: true,
        trackingPeriod: 'monthly',
        resetTime: 1
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

  function setupTestScenario(costControlConfig, applicationMode) {
    window.CostControl = new MockCostControl(costControlConfig);
    window.ConfigManager = new MockConfigManager({
      fakeConfiguration: {
        default_low_limit_threshold: 3,
        credit: { currency: 'R$' }
      },
      fakeSettings: {
        dataLimit: true,
        dataLimitValue: 40,
        dataLimitUnit: 'MB',
        lowLimit: true,
        lastTelephonyActivity: 3456
      },
      applicationMode: applicationMode
    });
  }

  function triggerEvent(element, eventName) {
    var event = document.createEvent('HTMLEvents');
    event.initEvent(eventName, true, true);
    element.dispatchEvent(event);
  }

  var requestToCheckLayout = function(assertingFunction, done) {
    return {
      request: function(requestedObj, callback) {
        (typeof assertingFunction === 'function') && assertingFunction(done);
      }
    };
  };

  function assertPostpaidLayout(done) {
    domSelectorsForLayout.forEach(function checkVisibility(element) {
      var domElement = document.querySelector(element.selector);
      assert.equal(domElement.hidden, element.isHiddenOnPostpaidLayout,
                   'The visibility of ' + element.name + ' is incorrect');
    });
    done();
  }

  function assertPrepaidLayout(done) {
    domSelectorsForLayout.forEach(function checkVisibility(element) {
      var domElement = document.querySelector(element.selector);
      assert.equal(domElement.hidden, element.isHiddenOnPrepaidLayout,
                   'The visibility of ' + element.name + ' is incorrect');
    });
    done();
  }

  function assertDataUsageOnlyLayout(done) {
    domSelectorsForLayout.forEach(function checkVisibility(element) {
      var domElement = document.querySelector(element.selector);
      assert.equal(domElement.hidden, element.isHiddenOnDataUsageOnlyLayout,
                   'The visibility of ' + element.name + 'is incorrect');
    });
    done();
  }

  test('Layout postpaid mode is correctly loaded', function(done) {
    var costControlConfig = requestToCheckLayout(assertPostpaidLayout, done);
    setupTestScenario(costControlConfig, 'POSTPAID');
    Settings.initialize();
  });

  test('Layout prepaid mode is correctly loaded', function(done) {
    var costControlConfig = requestToCheckLayout(assertPrepaidLayout, done);
    setupTestScenario(costControlConfig, 'PREPAID');
    Settings.initialize();
  });

  test('Layout data_usage_only mode is correctly loaded', function(done) {
    var costControlConfig = requestToCheckLayout(assertDataUsageOnlyLayout,
                                                  done);
    setupTestScenario(costControlConfig, 'DATA_USAGE_ONLY');
    Settings.initialize();
  });

  test('updateDataUsage works correctly', function(done) {
    setupPrepaidMode();
    var lastDataUsage = {
        timestamp: new Date(),
        today: new Date(),
        wifi: {
          total: 222
        },
        mobile: {
          total: 333
        }
      };

    sinon.stub(Settings, 'updateUI', function() {
      ConfigManager.mTriggerCallback('lastDataUsage', lastDataUsage,
                                     {lastCompleteDataReset: new Date() });

      var mobileDataUsage = Formatting.formatData(
        Formatting.roundData(lastDataUsage.mobile.total));

      var wifiDataUsage = Formatting.formatData(
        Formatting.roundData(lastDataUsage.wifi.total));

      assert.equal(mobileUsage.textContent, mobileDataUsage);
      assert.equal(wifiUsage.textContent, wifiDataUsage);

      Settings.updateUI.restore();
      ConfigManager.mRemoveObservers();
      done();
    });

    Settings.initialize();
  });

  test('Default values for reset time (monthly)', function(done) {
    setupPrepaidMode();

    sinon.stub(Settings, 'updateUI', function() {
      var today = new Date();

      // Initial value for tracking period is monthly and for resetTime 1
      // Force the initialization of the resetTime field
      ConfigManager.mTriggerCallback('trackingPeriod');
      assert.equal(ConfigManager.option('resetTime'), today.getDate());

      Settings.updateUI.restore();
      done();
    });
    Settings.initialize();
  });

  test('Default values for reset time (weekly)', function(done) {
    setupPrepaidMode();

    sinon.stub(Settings, 'updateUI', function() {
      var today = new Date();

      // Initial value for tracking period is monthly and for resetTime 1
      // Change tracking period to weekly
      ConfigManager.option('trackingPeriod', 'weekly');
      ConfigManager.mTriggerCallback('trackingPeriod', 'weekly');

      assert.equal(ConfigManager.option('trackingPeriod'), 'weekly');
      assert.equal(ConfigManager.option('resetTime'), today.getDay());
      Settings.updateUI.restore();
      done();
    });
    Settings.initialize();
  });

  suite('Data Limit Configurator Test Suite >', function() {
    var dataLimitDialog, dataLimitInput, dataLimitOkButton, limitUnitValue,
        dataLimitSwitchUnitButton, dataLimitHeader;
    var evtInput = new CustomEvent('input', {});

    setup(function() {
      dataLimitDialog = document.getElementById('data-limit-dialog');
      dataLimitInput = dataLimitDialog.querySelector('input');
      dataLimitOkButton = dataLimitDialog.querySelector('button.recommend');
      dataLimitHeader = document.getElementById('limit-dialog-header');

      dataLimitSwitchUnitButton = dataLimitDialog.
        querySelector('.switch-unit-button');
      limitUnitValue = dataLimitSwitchUnitButton.querySelector('span.tag');
    });

    function initDataLimitDialog() {
      // Init the dataLimitDialog values
      ConfigManager.mTriggerCallback('dataLimitValue', 40);
      ConfigManager.mTriggerCallback('dataLimitUnit', 'MB');

      var dataLimit = document.querySelector('[data-option=dataLimit]');
      assert.equal(dataLimit.value, 'on');

      // load Limit dialog
      var dataLimitButton =
        document.querySelector('[data-widget-type=data-limit]');
      triggerEvent(dataLimitButton, 'click');
    }

    function assertDataLimitInputInvalid() {
      assert.isTrue(dataLimitInput.classList.contains('error'));
      assert.isTrue(dataLimitOkButton.disabled);
    }

    function assertDataLimitInputValid() {
      assert.isFalse(dataLimitInput.classList.contains('error'));
      assert.isFalse(dataLimitOkButton.disabled);
    }

    suite('Valid Values >', function() {

      test('Real values', function(done) {
        setupPrepaidMode();
        sinon.stub(Settings, 'updateUI', function() {
          initDataLimitDialog();

          dataLimitInput.value = '912.05';
          dataLimitInput.dispatchEvent(evtInput);
          assertDataLimitInputValid();

          dataLimitInput.value = '0.5';
          dataLimitInput.dispatchEvent(evtInput);
          assertDataLimitInputValid();

          triggerEvent(dataLimitHeader, 'action');
          Settings.updateUI.restore();
          done();
        });
        Settings.initialize();
      });

      test('Atypical values', function(done) {
        setupPrepaidMode();
        sinon.stub(Settings, 'updateUI', function() {
          initDataLimitDialog();

          // bug 1073340 - 0.07 produces a decimal multiplication overflow
          dataLimitInput.value = '0.07';
          dataLimitInput.dispatchEvent(evtInput);
          assertDataLimitInputValid();

          triggerEvent(dataLimitHeader, 'action');
          Settings.updateUI.restore();
          done();
        });
        Settings.initialize();
      });

      test('Numbers without significant digits', function(done) {
        setupPrepaidMode();
        sinon.stub(Settings, 'updateUI', function() {
          initDataLimitDialog();

          dataLimitInput.value = '.1';
          dataLimitInput.dispatchEvent(evtInput);
          assertDataLimitInputValid();

          dataLimitInput.value = '.78';
          dataLimitInput.dispatchEvent(evtInput);
          assertDataLimitInputValid();

          triggerEvent(dataLimitHeader, 'action');
          Settings.updateUI.restore();
          done();
        });
        Settings.initialize();
      });

      test('Natural numbers', function(done) {
        setupPrepaidMode();
        sinon.stub(Settings, 'updateUI', function() {
          initDataLimitDialog();

          dataLimitInput.value = '120';
          dataLimitInput.dispatchEvent(evtInput);
          assertDataLimitInputValid();

          dataLimitInput.value = '0000456';
          dataLimitInput.dispatchEvent(evtInput);
          assertDataLimitInputValid();

          triggerEvent(dataLimitHeader, 'action');
          Settings.updateUI.restore();
          done();
        });
        Settings.initialize();
      });

      test('Natural numbers with no significant zeros', function(done) {
        setupPrepaidMode();
        sinon.stub(Settings, 'updateUI', function() {
          initDataLimitDialog();

          dataLimitInput.value = '0000456';
          dataLimitInput.dispatchEvent(evtInput);
          assertDataLimitInputValid();

          triggerEvent(dataLimitHeader, 'action');
          Settings.updateUI.restore();
          done();
        });
        Settings.initialize();
      });
    });

    suite('Invalid values >', function() {

      test('Negative Values', function(done) {
        setupPrepaidMode();
        sinon.stub(Settings, 'updateUI', function() {
          initDataLimitDialog();

          dataLimitInput.value = '-12.456';
          dataLimitInput.dispatchEvent(evtInput);
          assertDataLimitInputInvalid();

          triggerEvent(dataLimitHeader, 'action');
          Settings.updateUI.restore();
          done();
        });
        Settings.initialize();
      });

      test('Separator invalid', function(done) {
        setupPrepaidMode();
        sinon.stub(Settings, 'updateUI', function() {
          initDataLimitDialog();

          dataLimitInput.value = '12,456';
          dataLimitInput.dispatchEvent(evtInput);
          assertDataLimitInputInvalid();

          triggerEvent(dataLimitHeader, 'action');
          Settings.updateUI.restore();
          done();
        });
        Settings.initialize();
      });

      test('Too decimal Separators', function(done) {
        setupPrepaidMode();
        sinon.stub(Settings, 'updateUI', function() {
          initDataLimitDialog();

          dataLimitInput.value = '124..56';
          dataLimitInput.dispatchEvent(evtInput);
          assertDataLimitInputInvalid();

          triggerEvent(dataLimitHeader, 'action');
          Settings.updateUI.restore();
          done();
        });
        Settings.initialize();
      });

      test('Not numeric', function(done) {
        setupPrepaidMode();
        sinon.stub(Settings, 'updateUI', function() {
          initDataLimitDialog();

          dataLimitInput.value = 'a';
          dataLimitInput.dispatchEvent(evtInput);
          assertDataLimitInputInvalid();

          triggerEvent(dataLimitHeader, 'action');
          Settings.updateUI.restore();
          done();
        });
        Settings.initialize();
      });

      test('Too long', function(done) {
        setupPrepaidMode();
        sinon.stub(Settings, 'updateUI', function() {
          initDataLimitDialog();

          dataLimitInput.value = '12456';
          dataLimitInput.dispatchEvent(evtInput);
          assertDataLimitInputInvalid();

          triggerEvent(dataLimitHeader, 'action');
          Settings.updateUI.restore();
          done();
        });
        Settings.initialize();
      });
    });

    suite('Automatic input corrections >', function() {
      test('No action ', function(done) {
        setupPrepaidMode();
        sinon.stub(Settings, 'updateUI', function() {
          initDataLimitDialog();

          dataLimitInput.value = '12.34';
          dataLimitInput.dispatchEvent(evtInput);
          assert.equal(dataLimitInput.value, '12.34');

          dataLimitInput.value = '9912';
          dataLimitInput.dispatchEvent(evtInput);
          assert.equal(dataLimitInput.value, '9912');

          triggerEvent(dataLimitHeader, 'action');

          Settings.updateUI.restore();
          done();
        });

        Settings.initialize();
      });

      test('No corrections with invalid entries', function(done) {
        setupPrepaidMode();
        this.sinon.stub(Settings, 'updateUI', function() {
          initDataLimitDialog();

          dataLimitInput.value = '0';
          dataLimitInput.dispatchEvent(evtInput);
          assert.equal(dataLimitInput.value, '0');
          assertDataLimitInputInvalid();

          dataLimitInput.value = '0.';
          dataLimitInput.dispatchEvent(evtInput);
          assert.equal(dataLimitInput.value, '0.');
          assertDataLimitInputInvalid();

          dataLimitInput.value = '0.0';
          dataLimitInput.dispatchEvent(evtInput);
          assert.equal(dataLimitInput.value, '0.0');
          assertDataLimitInputInvalid();

          dataLimitInput.value = '.';
          dataLimitInput.dispatchEvent(evtInput);
          assert.equal(dataLimitInput.value, '.');
          assertDataLimitInputInvalid();

          dataLimitInput.value = '.0';
          dataLimitInput.dispatchEvent(evtInput);
          assert.equal(dataLimitInput.value, '.0');
          assertDataLimitInputInvalid();

          triggerEvent(dataLimitHeader, 'action');

          done();
        });

        Settings.initialize();
      });

      test('Removing left zeros ', function(done) {
        setupPrepaidMode();
        sinon.stub(Settings, 'updateUI', function() {
          initDataLimitDialog();

          dataLimitInput.value = '02.04';
          dataLimitInput.dispatchEvent(evtInput);
          assert.equal(dataLimitInput.value, '2.04');

          dataLimitInput.value = '007';
          dataLimitInput.dispatchEvent(evtInput);
          assert.equal(dataLimitInput.value, '7');

          dataLimitInput.value = '000012.31';
          dataLimitInput.dispatchEvent(evtInput);
          assert.equal(dataLimitInput.value, '12.31');

          triggerEvent(dataLimitHeader, 'action');

          Settings.updateUI.restore();
          done();
        });

        Settings.initialize();
      });

      test('Removing right zeros ', function(done) {
        setupPrepaidMode();
        sinon.stub(Settings, 'updateUI', function() {
          initDataLimitDialog();

          dataLimitInput.value = '77.60';
          dataLimitInput.dispatchEvent(evtInput);
          assert.equal(dataLimitInput.value, '77.6');

          dataLimitInput.value = '442.01000';
          dataLimitInput.dispatchEvent(evtInput);
          assert.equal(dataLimitInput.value, '442.01');

          triggerEvent(dataLimitHeader, 'action');

          Settings.updateUI.restore();
          done();
        });

        Settings.initialize();
      });

      test('Removing both sides ', function(done) {
        setupPrepaidMode();
        sinon.stub(Settings, 'updateUI', function() {
          initDataLimitDialog();

          dataLimitInput.value = '012.010';
          dataLimitInput.dispatchEvent(evtInput);
          assert.equal(dataLimitInput.value, '12.01');

          dataLimitInput.value = '0000062.1000';
          dataLimitInput.dispatchEvent(evtInput);
          assert.equal(dataLimitInput.value, '62.1');

          triggerEvent(dataLimitHeader, 'action');

          Settings.updateUI.restore();
          done();
        });

        Settings.initialize();
      });

      test('Fill with left zero ', function(done) {
        setupPrepaidMode();
        sinon.stub(Settings, 'updateUI', function() {
          initDataLimitDialog();

          dataLimitInput.value = '.31';
          dataLimitInput.dispatchEvent(evtInput);
          assert.equal(dataLimitInput.value, '0.31');

          triggerEvent(dataLimitHeader, 'action');

          Settings.updateUI.restore();
          done();
        });

        Settings.initialize();
      });
    });

    test('dataLimitConfigurer Cancel button behaviour', function(done) {
      setupPrepaidMode();
      sinon.stub(Settings, 'updateUI', function() {
        initDataLimitDialog();

        dataLimitInput.value = '124.56';
        dataLimitInput.dispatchEvent(evtInput);

        // Cancel not update the Config values


        assert.equal(ConfigManager.option('dataLimitUnit'), 'MB');
        assert.equal(ConfigManager.option('dataLimitValue'), '40');

        Settings.updateUI.restore();
        done();
      });

      Settings.initialize();
    });

    test('dataLimitConfigurer OK button behaviour', function(done) {
      setupPrepaidMode();
      sinon.stub(Settings, 'updateUI', function() {
        initDataLimitDialog();

        assert.equal(ConfigManager.option('dataLimitUnit'), 'MB');
        assert.equal(ConfigManager.option('dataLimitValue'), '40');

        // Update the dataLimit
        dataLimitInput.value = '124.56';
        dataLimitInput.dispatchEvent(evtInput);

        assert.equal(dataLimitSwitchUnitButton.getAttribute('data-l10n-id'),
                     'unit-MB');
        assert.equal(limitUnitValue.getAttribute('data-l10n-id'), 'MB');
        triggerEvent(dataLimitSwitchUnitButton, 'click');
        assert.equal(dataLimitSwitchUnitButton.getAttribute('data-l10n-id'),
                     'unit-GB');
        assert.equal(limitUnitValue.getAttribute('data-l10n-id'), 'GB');

        sinon.stub(SimManager, 'requestDataSimIcc', function() {});
        triggerEvent(dataLimitOkButton, 'click');

        assert.equal(ConfigManager.option('dataLimitUnit'), 'GB');
        assert.equal(ConfigManager.option('dataLimitValue'), '124.56');

        SimManager.requestDataSimIcc.restore();

        Settings.updateUI.restore();
        done();
      });

      Settings.initialize();
    });
  });
});
