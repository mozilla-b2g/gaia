/* global BalanceView, LazyLoader, AutoSettings, BalanceLowLimitView,
          ResetMenuDialog, ConfirmDialog, ViewManager, dataLimitConfigurer,
          Formatting
*/
/* exported debug, sendBalanceThresholdNotification */
/*
 * Settings is in charge of setup the setting section. It uses an AutoSettings
 * object to automatically bind markup with local settings.
 *
 * Settings have three drawing areas with views for current values of balance,
 * data usage and telephony.
 */
'use strict';
// Import global objects from parent window
var ConfigManager = window.parent.ConfigManager;
var CostControl = window.parent.CostControl;
var SimManager = window.parent.SimManager;
var Common = window.parent.Common;
var NetworkUsageAlarm = window.parent.NetworkUsageAlarm;

// Import global functions from parent window
var addNetworkUsageAlarm = window.parent.addNetworkUsageAlarm;
var resetTelephony = window.parent.resetTelephony;
navigator.mozL10n = window.parent.navigator.mozL10n;


// Import debug
var DEBUGGING = window.parent.DEBUGGING;
var debug = window.parent.debug;

var Settings = (function() {

  var costcontrol, vmanager, initialized, endLoadSettingsNotified;
  var plantypeSelector, phoneActivityTitle, phoneActivitySettings;
  var balanceTitle, balanceSettings, reportsTitle;
  var balanceView, resetMenuDialog, confirmDialog;

  function configureUI() {
    CostControl.getInstance(function _onCostControl(instance) {
      costcontrol = instance;

      // Debug options
      if (DEBUGGING) {
        loadDeveloperAids();
      }

      vmanager = new ViewManager();

      // HTML entities
      plantypeSelector = document.getElementById('plantype-settings');
      phoneActivityTitle = document.getElementById('phone-activity-settings');
      phoneActivitySettings =
        document.querySelector('#phone-activity-settings + .settings');
      balanceTitle = document.getElementById('balance-settings');
      balanceSettings =
        document.querySelector('#balance-settings + .settings');
      reportsTitle = document.getElementById('phone-internet-settings');

      // Subviews
      var balanceConfig = ConfigManager.configuration.balance;
      balanceView = new BalanceView(
        document.getElementById('balance'),
        document.querySelector('#balance + .meta'),
        balanceConfig ? balanceConfig.minimum_delay : undefined
      );

      var resetDialog = document.getElementById('reset-dialog');
      var resetDataDialog = document.getElementById('reset-data-dialog');

      resetMenuDialog = new ResetMenuDialog(resetDataDialog, vmanager);
      confirmDialog = new ConfirmDialog(resetDialog, vmanager);
      resetMenuDialog.initializeResetModes(confirmDialog);

      // Autosettings
      AutoSettings.addType('data-limit', dataLimitConfigurer);
      AutoSettings.initialize(ConfigManager, vmanager, '#settings-view');
      configureTelephonyReset();
      configureDataResets();
      addDoneConstrains();

      // Add an observer on dataLimit switch to active o deactivate alarms
      ConfigManager.observe(
        'dataLimit',
        function _onDataLimitChange(value, old, key, settings) {
          SimManager.requestDataSimIcc(function(dataSim) {
            var iccId = dataSim.iccId;
            var currentDataInterface = Common.getDataSIMInterface(iccId);
            if (!value) {
              NetworkUsageAlarm.clearAlarms(currentDataInterface);
            } else {
              addNetworkUsageAlarm(currentDataInterface,
                                   Common.getDataLimit(settings));
            }
          });
        },
        true
      );

      // Update layout when changing plantype
      ConfigManager.observe('plantype', updateUI, true);

      // Update views
      ConfigManager.observe('lastTelephonyActivity',
        function _updateTelephony(activity, old, key, settings) {
          updateTelephony(activity, settings.lastTelephonyReset);
        },
        true
      );

      ConfigManager.observe('lastDataUsage',
        function _updateDataUsage(stats, old, key, settings) {
          updateDataUsage(stats, settings.lastCompleteDataReset);
        },
        true
      );

      ConfigManager.observe('lastBalance',
        function _updateBalance(balance) {
          updateBalance(balance, balance.currency);
        },
        true
      );

      // Close button needs to acquire a reference to the settings view
      // manager to close itself.
      var close = document.getElementById('close-settings');
      close.addEventListener('click', function() {
        closeSettings();
      });

      function _setResetTimeToDefault(value, old, key, settings) {
        var today = new Date();
        var defaultResetTime = (settings.trackingPeriod === 'weekly') ?
          today.getDay() : today.getDate();
        if (settings.resetTime !== defaultResetTime) {
          ConfigManager.setOption({ resetTime: defaultResetTime });
        } else {
          Common.updateNextReset(settings.trackingPeriod, settings.resetTime);
        }
      }

      function _updateNextReset(value, old, key, settings) {
        Common.updateNextReset(settings.trackingPeriod, settings.resetTime);
      }

      ConfigManager.observe('resetTime', _updateNextReset, true);
      ConfigManager.observe('trackingPeriod', _setResetTimeToDefault, true);

      initialized = true;

      Settings.updateUI();
    });
  }

  function closeSettings() {
    window.parent.location.hash = '#';
  }

  // Loads extra HTML useful for debugging
  function loadDeveloperAids() {
    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType('text/plain');
    xhr.open('GET', '/debug.html', false);
    xhr.send();

    if (xhr.status === 200) {
      var src = document.createElement('DIV');
      // XXX: We use innerHTML precisely because we need parse the content
      // without introducing the overhead of DOM methods.
      src.innerHTML = xhr.responseText;
      var reference = document.getElementById('plantype-settings');
      var parent = reference.parentNode;
      [].forEach.call(src.childNodes, function(node) {
        reference = parent.insertBefore(node, reference.nextSibling);
      });
    }
  }

  // Configure reset dialogs for telephony and data usage
  function configureTelephonyReset() {
    var resetTelephonyButton = document.getElementById('reset-telephony');
    resetTelephonyButton.addEventListener('click', function() {
      confirmDialog.setMessage('reset-telephony-confirmation-warning', {});
      function resetAction() {
        resetTelephony();
        updateUI();
        confirmDialog.closeConfirmDialog();
      }
      confirmDialog.updateAcceptAction(resetAction);
      confirmDialog.showConfirmDialog();
    });
  }

  // Configure reset dialogs for telephony and data usage
  function configureDataResets() {
    // Button reset Data Usage Settings send to reset data dialog
    var resetDataUsage = document.getElementById('reset-data-usage');
    resetDataUsage.addEventListener('click', function _onDataReset() {
      var currentTotals = {
        mobile: costcontrol.lastDataResults.mobile.total,
        wifi: costcontrol.lastDataResults.wifi.total
      };
      resetMenuDialog.showResetMenuDialog(currentTotals);
    });
  }

  // Add particular constrains to the "Done" button
  var balanceLowLimitView;
  function addDoneConstrains() {
    var closeButton = document.getElementById('close-settings');
    balanceLowLimitView = new BalanceLowLimitView(
      document.getElementById('low-limit'),
      document.getElementById('low-limit-input')
    );
    balanceLowLimitView.onvalidation = function(evt) {
      closeButton.disabled = !evt.isValid;
    };
  }

  window.addEventListener('localized', function _onLocalize() {
    if (initialized) {
      updateUI();
    }
  });

  var currentMode;
  function updateUI() {
    ConfigManager.requestAll(function _onInfo(configuration, settings) {
      // L10n
      Common.localizeWeekdaySelector(
        document.getElementById('select-weekday'));

      // Layout
      var mode = ConfigManager.getApplicationMode();
      if (currentMode !== mode) {
        currentMode = mode;
        var hidePlantypeSelector = (mode === 'DATA_USAGE_ONLY');
        var hidePhoneActivity = (mode !== 'POSTPAID');
        var hideBalance = (mode !== 'PREPAID');
        var hideReportsTitle = (mode === 'PREPAID');
        var textReportsTitle = (mode === 'POSTPAID') ?
          'phone-and-internet-data-report' : 'internet-data-report';

        reportsTitle.querySelector('span').setAttribute(
          'data-l10n-id', textReportsTitle
        );

        balanceLowLimitView.disabled = (mode !== 'PREPAID');
        plantypeSelector.hidden = hidePlantypeSelector;
        phoneActivityTitle.hidden = hidePhoneActivity;
        phoneActivitySettings.hidden = hidePhoneActivity;
        balanceTitle.hidden = hideBalance;
        balanceSettings.hidden = hideBalance;
        reportsTitle.hidden = hideReportsTitle;
      }

      // Views
      var requestObj = {
        type: 'datausage'
      };
      costcontrol.request(requestObj, function _onDataStats(result) {
        var stats = result.data;
        updateDataUsage(stats, settings.lastCompleteDataReset);
      });

      switch (mode) {
        case 'PREPAID':
          updateBalance(settings.lastBalance, configuration.credit.currency);
          break;
        case 'POSTPAID':
          updateTelephony(settings.lastTelephonyActivity,
                          settings.lastTelephonyReset);
          break;
      }
      if (endLoadSettingsNotified) {
        window.performance.measure('loadSettings', 'loadSettingsStart');
        endLoadSettingsNotified = true;
      }
    });
  }

  // Update data usage view on settings
  function updateDataUsage(datausage, lastCompleteDataReset) {
    var mobileUsage = document.querySelector('#mobile-data-usage > span');
    var data = Formatting.roundData(datausage.mobile.total);
    mobileUsage.textContent = Formatting.formatData(data);

    var wifiUsage = document.querySelector('#wifi-data-usage > span');
    data = Formatting.roundData(datausage.wifi.total);
    wifiUsage.textContent = Formatting.formatData(data);

    updateDataUsageTimestamp(lastCompleteDataReset, datausage.timestamp);
  }

  var dataUsagePeriod = { begin: null, end: null };
  function updateDataUsageTimestamp(begin, end) {
    dataUsagePeriod.begin = begin;
    dataUsagePeriod.end = end;
    var timestamp = document.querySelector('#wifi-data-usage + .meta');
    timestamp.innerHTML = '';
    timestamp.appendChild(Formatting.formatTimeHTML(begin, end));
  }

  // Update balance view on settings
  function updateBalance(lastBalance, currency) {
    var limitCurrency = document.getElementById('settings-low-limit-currency');
    limitCurrency.textContent = currency;
    balanceView.update(lastBalance);
  }

  // Update telephony counters on settings
  function updateTelephony(activity, lastTelephonyReset) {
    var calltimeSpan = document.getElementById('calltime');
    var smscountSpan = document.getElementById('smscount');
    Common.localize(calltimeSpan, 'magnitude', {
      value: Formatting.computeTelephonyMinutes(activity),
      unit: 'min.'
    });
    Common.localize(smscountSpan, 'magnitude', {
      value: activity.smscount,
      unit: 'SMS'
    });
    updateTelephonyTimestamp(lastTelephonyReset, activity.timestamp);
  }

  var telephonyPeriod = { begin: null, end: null };
  function updateTelephonyTimestamp(begin, end) {
    telephonyPeriod.begin = begin;
    telephonyPeriod.end = end;
    var timestamp = document.getElementById('telephony-timestamp');
    timestamp.innerHTML = '';
    timestamp.appendChild(Formatting.formatTimeHTML(begin, end));
  }

  window.addEventListener('timeformatchange', function () {
    updateTelephonyTimestamp(telephonyPeriod.begin, telephonyPeriod.end);
    updateDataUsageTimestamp(dataUsagePeriod.begin, dataUsagePeriod.end);
  });

  return {
    initialize: function() {
      var SCRIPTS_NEEDED = [
        'js/utils/toolkit.js',
        'shared/js/date_time_helper.js',
        'js/utils/formatting.js',
        'js/views/BalanceLowLimitView.js',
        'js/settings/limitdialog.js',
        'js/settings/autosettings.js',
        'js/view_manager.js',
        'js/views/BalanceView.js',
        'js/views/ResetMenuDialog.js',
        'js/views/ConfirmDialog.js'
      ];
      LazyLoader.load(SCRIPTS_NEEDED, function() {
        if (!Common.allNetworkInterfaceLoaded) {
          Common.loadNetworkInterfaces(configureUI);
        } else {
          configureUI();
        }
      });
    },
    updateUI: updateUI
  };

}());

Settings.initialize();
