/*
 * Settings is in charge of setup the setting section. It uses an AutoSettings
 * object to automatically bind markup with local settings.
 *
 * Settings have three drawing areas with views for current values of balance,
 * data usage and telephony.
 */

 // Import global objects from parent window
 var ConfigManager = window.parent.ConfigManager;
 var CostControl = window.parent.CostControl;
 var Formatting = window.parent.Formatting;

 // Import global functions from parent window
 var updateNextReset = window.parent.updateNextReset;
 var formatTimeHTML = window.parent.formatTimeHTML;
 var formatData = window.parent.formatData;
 var roundData = window.parent.roundData;
 var resetData = window.parent.resetData;
 var resetTelephony = window.parent.resetTelephony;
 var localizeWeekdaySelector = window.parent.localizeWeekdaySelector;
 var computeTelephonyMinutes = window.parent.computeTelephonyMinutes;
 var _ = window.parent._;

 // Import debug
 var DEBUGGING = window.parent.DEBUGGING;
 var debug = window.parent.debug;

var Settings = (function() {

  'use strict';

  var costcontrol, vmanager, autosettings, initialized;
  var plantypeSelector, phoneActivityTitle, phoneActivitySettings;
  var balanceTitle, balanceSettings, reportsTitle;
  var balanceView;

  function configureUI() {
    CostControl.getInstance(function _onCostControl(instance) {
      costcontrol = instance;

      // Debug options
      if (DEBUGGING) {
        loadDeveloperAids();
      }

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

      // Autosettings
      vmanager = new ViewManager();
      AutoSettings.addType('data-limit', dataLimitConfigurer);
      AutoSettings.initialize(ConfigManager, vmanager, '#settings-view');
      configureTelephonyReset();
      configureDataResets();
      addDoneConstrains();

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
        var firstWeekDay = parseInt(_('weekStartsOnMonday'), 10);
        var defaultResetTime = (settings.trackingPeriod === 'weekly') ?
                                                                  firstWeekDay :
                                                                  1;
        if (settings.resetTime !== defaultResetTime) {
          ConfigManager.setOption({ resetTime: defaultResetTime });
        } else {
          updateNextReset(settings.trackingPeriod, settings.resetTime);
        }
      }

      function _updateNextReset(value, old, key, settings) {
        updateNextReset(settings.trackingPeriod, settings.resetTime);
      }

      ConfigManager.observe('resetTime', _updateNextReset, true);
      ConfigManager.observe('trackingPeriod', _setResetTimeToDefault, true);

      initialized = true;

      updateUI();
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
    var telephonyDialog = document.getElementById('reset-telephony-dialog');

    // Button Reset Phone Activity Settings send to confirmation dialog
    var resetTelephonyButton = document.getElementById('reset-telephony');
    resetTelephonyButton.addEventListener('click',
      function _onTelephonyReset() {
        vmanager.changeViewTo(telephonyDialog.id);
      }
    );

    // Reset telephony statistics
    var ok = telephonyDialog.querySelector('.danger');
    ok.addEventListener('click', function _onAcceptReset() {
      resetTelephony();
      updateUI();
      vmanager.closeCurrentView();
    });

    var cancel = telephonyDialog.querySelector('.close-reset-dialog');
    cancel.addEventListener('click', function _onCancelReset() {
      vmanager.closeCurrentView();
    });

  }

  // Configure reset dialogs for telephony and data usage
  function configureDataResets() {
    var dataDialog = document.getElementById('reset-data-dialog');

    // Button reset Data Usage Settings send to reset data dialog
    var resetDataUsage = document.getElementById('reset-data-usage');
    resetDataUsage.addEventListener('click', function _onDataReset() {
      vmanager.changeViewTo(dataDialog.id);
    });

    var resetWifiDataUsage = document.getElementById('reset-data-wifi-usage');
    resetWifiDataUsage.addEventListener('click',
      function _onDataReset() {
        // Reset data wifi, take in count spent offsets to fix the charts
        resetData('wifi');
        updateUI();
        vmanager.closeCurrentView();
      });

    var resetMobileDataUsage = document.
                                      getElementById('reset-data-mobile-usage');
    resetMobileDataUsage.addEventListener('click',
      function _onDataReset() {
        // Reset data mobile, take in count spent offsets to fix the charts
        resetData('mobile');
        updateUI();
        vmanager.closeCurrentView();
      });

    var resetAllDataUsage = document.getElementById('reset-all-data-usage');
    resetAllDataUsage.addEventListener('click',
      function _onDataReset() {
        // Reset all data usage, take in count spent offsets to fix the charts
        resetData('all');
        updateUI();
        vmanager.closeCurrentView();
      });

    var cancel = dataDialog.querySelector('.close-reset-dialog');
    cancel.addEventListener('click', function _onCancelReset() {
      vmanager.closeCurrentView();
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
      localizeWeekdaySelector(document.getElementById('select-weekday'));

      // Layout
      var mode = ConfigManager.getApplicationMode();
      if (currentMode !== mode) {
        currentMode = mode;
        var hidePlantypeSelector = (mode === 'DATA_USAGE_ONLY');
        var hidePhoneActivity = (mode !== 'POSTPAID');
        var hideBalance = (mode !== 'PREPAID');
        var hideReportsTitle = (mode === 'PREPAID');

        balanceLowLimitView.disabled = (mode !== 'PREPAID');
        plantypeSelector.setAttribute('aria-hidden', hidePlantypeSelector);
        phoneActivityTitle.setAttribute('aria-hidden', hidePhoneActivity);
        phoneActivitySettings.setAttribute('aria-hidden', hidePhoneActivity);
        balanceTitle.setAttribute('aria-hidden', hideBalance);
        balanceSettings.setAttribute('aria-hidden', hideBalance);
        reportsTitle.setAttribute('aria-hidden', hideReportsTitle);
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
    });
  }

  // Update data usage view on settings
  function updateDataUsage(datausage, lastCompleteDataReset) {
    var mobileUsage = document.querySelector('#mobile-data-usage > span');
    var data = roundData(datausage.mobile.total);
    mobileUsage.textContent = formatData(data);

    var wifiUsage = document.querySelector('#wifi-data-usage > span');
    data = roundData(datausage.wifi.total);
    wifiUsage.textContent = formatData(data);

    var timestamp = document.querySelector('#wifi-data-usage + .meta');
    timestamp.innerHTML = '';
    timestamp.appendChild(formatTimeHTML(lastCompleteDataReset,
                                         datausage.timestamp));
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
    calltimeSpan.textContent = _('magnitude', {
      value: computeTelephonyMinutes(activity),
      unit: 'min.'
    });
    smscountSpan.textContent = _('magnitude', {
      value: activity.smscount,
      unit: 'SMS'
    });
    var timestamp = document.getElementById('telephony-timestamp');
    timestamp.innerHTML = '';
    timestamp.appendChild(formatTimeHTML(
      lastTelephonyReset,
      activity.timestamp
    ));
  }

  return {
    initialize: function() {
      var SCRIPTS_NEEDED = [
        'js/views/BalanceLowLimitView.js',
        'js/settings/limitdialog.js',
        'js/settings/autosettings.js',
        'js/view_manager.js',
        'js/views/BalanceView.js'
      ];
      LazyLoader.load(SCRIPTS_NEEDED, configureUI);
    },
    updateUI: updateUI
  };

}());

Settings.initialize();
