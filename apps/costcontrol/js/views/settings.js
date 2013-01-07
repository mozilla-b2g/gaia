/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var viewManager = new ViewManager();

// Retrieve service
var Service = getService(function ccapp_onServiceReady(evt) {
  // If the service is not ready, when ready it sets the Service object
  // again and setup the application.
  Service = evt.detail.service;
  setupSettings();
});
if (Service)
  setupSettings();

// Settings view is in charge of display and allow user interaction to
// changing the application customization.
function setupSettings() {

  function _setBalanceView(balanceObj) {
    balanceObj = balanceObj || Service.getLastBalance();
    var settingsCurrency = document.getElementById('settings-currency');
    var settingsCredit = document.getElementById('settings-credit');
    var settingsTime = document.getElementById('settings-time');
    var settingsLowLimitCurrency =
      document.getElementById('settings-low-limit-currency');

    if (balanceObj) {
      settingsCurrency.textContent = balanceObj.currency;
      settingsLowLimitCurrency.textContent = balanceObj.currency;
      settingsCredit.textContent = formatBalance(balanceObj.balance);
      settingsTime.textContent = formatTime(balanceObj.timestamp);
    } else {
      settingsCurrency.textContent = '';
      settingsLowLimitCurrency.textContent = '';
      settingsCredit.textContent = '--';
      settingsTime.textContent = _('never');
    }
  }

  // Reset the balance view and attach a listener to keep the UI updated
  // when updating the balance.
  function _configureBalanceView() {
    _setBalanceView();
    Service.setBalanceCallbacks({
      onsuccess: function ccapp_onBalanceSuccess(evt) {
        var balance = evt.detail;
        _setBalanceView(balance);
      }
    });
  }

  // Shows the reset confirmation
  function _showResetConfirmation(callback) {
    var dialogId = 'reset-confirmation-dialog';
    var dialog = document.getElementById(dialogId);
    viewManager.changeViewTo(dialogId);

    var cancel = dialog.querySelector('button.close-dialog');
    cancel.addEventListener('click', function ccapp_cancelConfimation() {
      viewManager.closeCurrentView();
    });

    var confirm = dialog.querySelector('button.danger');
    confirm.addEventListener('click', function ccapp_onConfirm(evt) {
      viewManager.closeCurrentView();
      callback(evt);
    });
  }

  // Read telephony information
  function _setTelephonyView() {
    function toMinutes(milliseconds) {
      return Math.ceil(milliseconds / (1000 * 60));
    }

    // Dates
    var formattedTime = _('never');
    var lastReset = Service.settings.option('lastreset');
    if (lastReset !== null)
      formattedTime = (new Date(lastReset))
                      .toLocaleFormat(_('short-date-format'));
    document.getElementById('telephony-from-date').textContent = formattedTime;

    var now = new Date();
    document.getElementById('telephony-to-date').textContent =
      _('today') + ', ' + now.toLocaleFormat('%H:%M');

    // Counters
    document.getElementById('calltime').textContent =
      toMinutes(Service.settings.option('calltime'));
    document.getElementById('smscount').textContent =
      Service.settings.option('smscount');
  }

  // Attach listener to keep telephony information updated
  function _configureTelephonyView() {
    Service.settings.observe('calltime', _setTelephonyView);
    Service.settings.observe('smscount', _setTelephonyView);
    document.getElementById('reset-telephony').addEventListener('click',
      function ccapp_resetTelephony() {
        _showResetConfirmation(Service.resetTelephony);
      }
    );
  }

  // Read data-usage information
  function _setDataUsageView() {
    // Dates
    var formattedTime = _('never');
    var lastReset = Service.settings.option('lastdatareset');
    if (lastReset !== null)
      formattedTime = (new Date(lastReset))
                      .toLocaleFormat(_('short-date-format'));
    document.getElementById('data-usage-from-date').textContent = formattedTime;

    var now = new Date();
    document.getElementById('data-usage-to-date').textContent =
      _('today') + ', ' + now.toLocaleFormat('%H:%M');

    // Mobile data
    var mobileData = 0;
    var dataUsage = Service.settings.option('lastdatausage');
    if (dataUsage)
      mobileData = dataUsage.mobile.total;
    document.getElementById('mobile-data-usage').textContent =
      formatData(roundData(mobileData));
  }

  // Attach listener to keep data usage information updated
  function _configureDataUsageView() {
    Service.settings.observe('lastdatausage', _setDataUsageView);
    Service.settings.observe('lastdatareset', _setDataUsageView);
    document.getElementById('reset-data-usage').addEventListener('click',
      function ccapp_resetDataUsage() {
        _showResetConfirmation(Service.resetDataUsage);
      }
    );
  }

  function _configureUI() {
    var autoSettings = new AutoSettings(Service.settings, viewManager);
    autoSettings.customRecognizer = dataLimitRecognizer;
    autoSettings.addType('data-limit', dataLimitConfigurer);
    autoSettings.configure();

    _configureBalanceView();
    _configureTelephonyView();
    _configureDataUsageView();
  }

  // Adapt the layout depending plantype
  function _changeLayout(planType) {
    function setSectionHeaderVisibility(sectionId, visibility) {
      var header = document.getElementById(sectionId);
      header.setAttribute('aria-hidden', !visibility + '');
    }

    function setSectionVisibility(sectionId, visibility) {
      setSectionHeaderVisibility(sectionId, visibility);
      var entries = document.querySelector('#' + sectionId + ' + ul');
      entries.setAttribute('aria-hidden', !visibility + '');
    }

    function moveResetEntriesTo(sectionId) {
      var entries = document.querySelectorAll('.reset-entry');
      var ul = document.querySelector('#' + sectionId + ' + ul');
      [].forEach.call(entries, function ccapp_appendResetEntry(entry) {
        ul.appendChild(entry);
      });
    }

    var status = Service.getServiceStatus();
    var plantype = document.getElementById('plantype-settings');

    // Only data layout
    if (!status.enabledFunctionalities.balance &&
        !status.enabledFunctionalities.telephony) {

      plantype.setAttribute('aria-hidden', 'true');
      setSectionVisibility('phone-activity-settings', false);
      setSectionVisibility('balance-settings', false);
      setSectionVisibility('data-usage-settings', true);
      setSectionHeaderVisibility('data-usage-settings', false);
      setSectionVisibility('phone-internet-settings', false);
      moveResetEntriesTo('data-usage-settings');

    // Prepaid layout
    } else if (planType === Service.PLAN_PREPAID) {

      plantype.setAttribute('aria-hidden', 'false');
      setSectionVisibility('phone-activity-settings', false);
      setSectionVisibility('balance-settings', true);
      setSectionVisibility('data-usage-settings', true);
      setSectionVisibility('phone-internet-settings', false);
      moveResetEntriesTo('data-usage-settings');

    // Postpaid layout
    } else if (planType === Service.PLAN_POSTPAID) {

      plantype.setAttribute('aria-hidden', 'false');
      setSectionVisibility('phone-activity-settings', true);
      setSectionVisibility('balance-settings', false);
      setSectionVisibility('data-usage-settings', true);
      setSectionVisibility('phone-internet-settings', true);
      moveResetEntriesTo('phone-internet-settings');
    }
  }

  // Configure each settings' control and paint the interface
  var _initialized = false;
  function _init() {
    _configureUI();

    // Change layout depending on plantype
    Service.settings.observe('plantype', _changeLayout);

    // Close settings
    var close = document.getElementById('close-settings');
    close.addEventListener('click', function ccapp_closeSettings() {
      parent.settingsVManager.closeCurrentView();
    });

    _initialized = true;
  }

  // Repaint settings interface reading from local settings and localizing
  function _updateUI() {
    _setBalanceView();
    _setTelephonyView();
  }

  // Updates the UI to match the localization
  // First time the application runs, it also initializes the settings module
  function _localize() {
    if (!_initialized)
      _init();

    _updateUI();
  }

  // Delay the initialization until `localized` event is triggered
  window.addEventListener('localized', _localize);

}
