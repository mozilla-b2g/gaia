/* global _, CostControl, ConfigManager, debug,
          Formatting, SimManager, Common */
/*
 * The telephony tab is in charge of show telephony and billing cycle
 * information.
 *
 * It has two areas of drawing: one for the counters and another for
 */
'use strict';

var TelephonyTab = (function() {
  var costcontrol, initialized = false;
  var view, smscount, calltime, time, resetDate;
  var telephonyPeriod = { begin: null, end: null };

  function setupTab() {
    if (initialized) {
      return;
    }

    CostControl.getInstance(function _onCostControl(instance) {
      costcontrol = instance;

      // HTML entities
      view = document.getElementById('telephony-tab');
      smscount = document.getElementById('telephony-smscount');
      calltime = document.getElementById('telephony-calltime');
      time = document.getElementById('telephony-time');
      resetDate = document.getElementById('reset-date');

      window.addEventListener('localized', localize);

      // Configure updates
      document.addEventListener('visibilitychange', updateWhenVisible, true);
      ConfigManager.observe('lastTelephonyActivity', updateCounters, true);
      ConfigManager.observe('lastTelephonyReset', updateUI, true);
      ConfigManager.observe('nextReset', updateNextReset, true);

      // Timeformat
      window.addEventListener('timeformatchange', function () {
        updateTimePeriod(
          telephonyPeriod.begin, null, null, telephonyPeriod.end);
      });

      updateUI();
      initialized = true;
    });
  }

  function localize() {
    if (initialized) {
      updateUI();
    }
  }

  function finalize() {
    if (!initialized) {
      return;
    }

    document.removeEventListener('visibilitychange', updateWhenVisible);
    ConfigManager.removeObserver('lastTelephonyActivity', updateCounters);
    ConfigManager.removeObserver('lastTelephonyReset', updateUI);
    ConfigManager.removeObserver('nextReset', updateNextReset);

    initialized = false;
  }

  function updateWhenVisible() {
    if (!document.hidden && initialized) {
      updateUI();
    }
  }

  function updateUI() {
    var requestObj = { type: 'telephony' };
    SimManager.requestDataSimIcc(function(dataSimIcc) {
      ConfigManager.requestSettings(dataSimIcc.iccId,
                                    function _onSettings(settings) {
        costcontrol.request(requestObj, function _afterRequest(result) {
          var telephonyActivity = result.data;
          debug('Last telephony activity:', telephonyActivity);
          updateTimePeriod(settings.lastTelephonyReset, null, null, settings);
          updateCounters(telephonyActivity);
          updateNextReset(settings.nextReset, null, null, settings);
        });
      });
    });
  }

  function updateTimePeriod(lastReset, old, key, settings) {
    telephonyPeriod.begin = lastReset;
    telephonyPeriod.end = settings.lastTelephonyActivity.timestamp;
    time.innerHTML = '';
    time.appendChild(Formatting.formatTimeHTML(lastReset, telephonyPeriod.end));
  }

  function updateCounters(activity) {
    Common.localize(smscount, 'magnitude', {
      value: activity.smscount,
      unit: 'SMS'
    });
    Common.localize(calltime, 'magnitude', {
      value: Formatting.computeTelephonyMinutes(activity),
      unit: 'min.'
    });
  }

  function updateNextReset(reset, old, key, settings) {
    var billingCycle = document.getElementById('billing-cycle');
    if (settings.trackingPeriod === 'never') {
      billingCycle.hidden = true;
    } else {
      billingCycle.hidden = false;
      var content = Formatting.getFormattedDate(settings.nextReset,
        _('short-date-format'));
      resetDate.textContent = content;
    }
  }

  return {
    initialize: setupTab,
    finalize: finalize
  };
}());

TelephonyTab.initialize();
