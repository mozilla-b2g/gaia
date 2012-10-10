/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Data Usage is in charge of display detailed information about data
// consumption per application and interface.
var TAB_TELEPHONY = 'telephony-tab';
viewManager.tabs[TAB_TELEPHONY] = (function cc_setUpDataUsage() {

  function _init() {
    var status = Service.getServiceStatus();
    if (!status.enabledFunctionalities.telephony) {
      debug('Telephony functionality disabled. Skippin Telephony Tab set up.');
      return;
    }

    debug('Initializing Telephony Tab');
    var balanceFilter = document.getElementById('telephony-tab-filter');
    balanceFilter.addEventListener('click', function ccapp_onBalanceTab() {
      viewManager.changeViewTo(TAB_TELEPHONY);
    });

    // Observe smscount and calltime
    Service.settings.observe('smscount', _updateUICounters);
    Service.settings.observe('calltime', _updateUICounters);
    Service.settings.observe('lastreset', _updateUICounters);
    Service.settings.observe('next_reset', _updateUITrackingInfo);

    _updateUI();
  }

  function _updateUICounters() {
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

  function _updateUITrackingInfo() {
    var resetDate = document.getElementById('reset-date');
    var trackingPeriod = Service.settings.option('tracking_period');
    if (trackingPeriod === Service.TRACKING_NEVER) {
      resetDate.textContent = _('never');
      return;
    }

    var nextResetDate = Service.settings.option('next_reset');
    if (!nextResetDate) {
      resetDate.textContent = _('never');
      return;
    }

    resetDate.textContent =
      nextResetDate.toLocaleFormat(_('short-date-format'));
  }

  function _updateUI() {
    _updateUICounters();
    _updateUITrackingInfo();
  }

  // Updates the UI to match the localization
  function _localize() {
    _updateUI();
  }

  return {
    init: _init,
    localize: _localize,
    updateUI: _updateUI
  };
}());

// Add to views as well
Views[TAB_TELEPHONY] = viewManager.tabs[TAB_TELEPHONY];
