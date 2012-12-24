
/*
 * Settings is in charge of setup the setting section. It uses an AutoSettings
 * object to automatically bind markup with local settings.
 *
 * Settings have three drawing areas with views for current values of balance,
 * data usage and telephony.
 */

var Settings = (function() {

  'use strict';

  var costcontrol, vmanager, autosettings;
  var plantypeSelector, phoneActivityTitle, phoneActivitySettings;
  var balanceTitle, balanceSettings, reportsTitle;
  function configureUI() {
    CostControl.getInstance(function _onCostControl(instance) {
      costcontrol = instance;

      // HTML entities
      plantypeSelector = document.getElementById('plantype-settings');
      phoneActivityTitle = document.getElementById('phone-activity-settings');
      phoneActivitySettings =
        document.querySelector('#phone-activity-settings + .settings');
      balanceTitle = document.getElementById('balance-settings');
      balanceSettings =
        document.querySelector('#balance-settings + .settings');
      reportsTitle = document.getElementById('phone-internet-settings');

      // Autosettings
      vmanager = new ViewManager();
      AutoSettings.addType('data-limit', dataLimitConfigurer);
      AutoSettings.initialize(ConfigManager, vmanager, '#settings-view');
      configureResets();

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
          updateDataUsage(stats, settings.lastDataReset);
        },
        true
      );

      ConfigManager.observe('lastBalance',
        function _updateBalance(balance) {
          updateBalance(balance, balance.currency);
        },
        true
      );

      function _updateNextReset(value, old, key, settings) {
        updateNextReset(settings.trackingPeriod, settings.resetTime);
      }
      ConfigManager.observe('resetTime', _updateNextReset, true);
      ConfigManager.observe('trackingPeriod', _updateNextReset, true);

      updateUI();
    });
  }

  // Configure reset dialogs for telephony and data usage
  function configureResets() {
    var mode;
    var dialog = document.getElementById('reset-confirmation-dialog');

    var resetTelephony = document.getElementById('reset-telephony');
    resetTelephony.addEventListener('click', function _onTelephonyReset() {
      mode = 'telephony';
      vmanager.changeViewTo(dialog.id);
    });

    var resetDataUsage = document.getElementById('reset-data-usage');
    resetDataUsage.addEventListener('click', function _onTelephonyReset() {
      mode = 'data-usage';
      vmanager.changeViewTo(dialog.id);
    });

    // Reset statistics
    var ok = dialog.querySelector('.danger');
    ok.addEventListener('click', function _onAcceptReset() {

      // Reset data usage, take in count spent offsets to fix the charts
      if (mode === 'data-usage')
        resetData();

      // Reset telephony counters
      else if (mode === 'telephony')
        resetTelephony();

      updateUI();
      vmanager.closeCurrentView();
    });

    // Cancel reset
    var cancel = dialog.querySelector('.close-dialog');
    cancel.addEventListener('click', function _onCancelReset() {
      vmanager.closeCurrentView();
    });
  }

  window.addEventListener('localized', function _onLocalize() {
    updateUI();
  });

  var currentMode;
  function updateUI() {

    ConfigManager.requestAll(function _onInfo(configuration, settings) {

      // Layout
      var mode = costcontrol.getApplicationMode(settings);
      if (currentMode !== mode) {
        currentMode = mode;
        var hidePlantypeSelector = (mode === 'DATA_USAGE_ONLY');
        var hidePhoneActivity = (mode !== 'POSTPAID');
        var hideBalance = (mode !== 'PREPAID');
        var hideReportsTitle = (mode === 'PREPAID');

        plantypeSelector.setAttribute('aria-hidden', hidePlantypeSelector);
        phoneActivityTitle.setAttribute('aria-hidden', hidePhoneActivity);
        phoneActivitySettings.setAttribute('aria-hidden', hidePhoneActivity);
        balanceTitle.setAttribute('aria-hidden', hideBalance);
        balanceSettings.setAttribute('aria-hidden', hideBalance);
        reportsTitle.setAttribute('aria-hidden', hideReportsTitle);
      }

      // Views
      var requestObj = { type: 'datausage' };
      costcontrol.request(requestObj, function _onDataStats(result) {
        var stats = result.data;
        updateDataUsage(stats, settings.lastDataReset);
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
  function updateDataUsage(datausage, lastDataReset) {
    var mobileUsage = document.querySelector('#mobile-data-usage > span');
    var timestamp = document.querySelector('#mobile-data-usage + .meta');
    var data = roundData(datausage.mobile.total);
    mobileUsage.innerHTML = formatData(data);
    timestamp.innerHTML = formatTimeHTML(lastDataReset, datausage.timestamp);
  }

  // Update balance view on settings
  function updateBalance(lastBalance, currency) {
    var limitCurrency = document.getElementById('settings-low-limit-currency');
    limitCurrency.innerHTML = currency;

    var balance = document.getElementById('balance');
    if (!lastBalance) {
      balance.innerHTML = _('not-available');
      return;
    }

    var timestamp = document.querySelector('#mobile-data-usage + .meta');
    balance.innerHTML = _('currency', {
      value: lastBalance.balance,
      currency: lastBalance.currency
    });
    timestamp.innerHTML = formatTimeHTML(lastBalance.timestamp);
  }

  // Update telephony counters on settings
  function updateTelephony(activity, lastTelephonyReset) {
    var calltimeSpan = document.getElementById('calltime');
    var smscountSpan = document.getElementById('smscount');
    calltimeSpan.innerHTML = _('magnitude', {
      value: Math.ceil(activity.calltime / 60000),
      unit: 'min.'
    });
    smscountSpan.innerHTML = _('magnitude', {
      value: activity.smscount,
      unit: 'SMS'
    });
    var timestamp = document.getElementById('telephony-timestamp');
    timestamp.innerHTML = formatTimeHTML(lastTelephonyReset,
                                         activity.timestamp);
  }

  return {
    initialize: configureUI,
    updateUI: updateUI
  };

}());
