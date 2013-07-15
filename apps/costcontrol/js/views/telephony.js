
/*
 * The telephony tab is in charge of show telephony and billing cycle
 * information.
 *
 * It has two areas of drawing: one for the counters and another for
 */


var TelephonyTab = (function() {
  'use strict';
  var costcontrol, initialized = false;
  var view, smscount, calltime, time, resetDate;
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
    ConfigManager.requestSettings(function _onSettings(settings) {
      costcontrol.request(requestObj, function _afterRequest(result) {
        var telephonyActivity = result.data;
        debug('Last telephony activity:', telephonyActivity);
        updateTimePeriod(settings.lastTelephonyReset, null, null, settings);
        updateCounters(telephonyActivity);
        updateNextReset(settings.nextReset, null, null, settings);
      });
    });
  }

  function updateTimePeriod(lastReset, old, key, settings) {
    time.innerHTML = '';
    time.appendChild(formatTimeHTML(lastReset,
                                    settings.lastTelephonyActivity.timestamp));

  }

  function updateCounters(activity) {
    smscount.textContent = _('magnitude', {
      value: activity.smscount,
      unit: 'SMS'
    });
    calltime.textContent = _('magnitude', {
      value: computeTelephonyMinutes(activity),
      unit: 'min.'
    });
  }

  function updateNextReset(reset, old, key, settings) {
    var billingCycle = document.getElementById('billing-cycle');
    if (settings.trackingPeriod === 'never') {
      billingCycle.setAttribute('aria-hidden', true);
    } else {
      billingCycle.setAttribute('aria-hidden', false);
      var dateFormatter = new navigator.mozL10n.DateTimeFormat();
      var content = dateFormatter.localeFormat(settings.nextReset,
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
