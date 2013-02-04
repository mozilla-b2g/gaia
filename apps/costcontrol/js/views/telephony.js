
/*
 * The telephony tab is in charge of show telephony and billing cycle
 * information.
 *
 * It has two areas of drawing: one for the counters and another for
 */


var TelephonyTab = (function() {
  'use strict';
  var costcontrol, tabmanager, initialized = false;
  var view, smscount, calltime, time, resetDate;
  function setupTab(tmgr) {
    if (initialized) {
      return;
    }

    CostControl.getInstance(function _onCostControl(instance) {
      costcontrol = instance;
      tabmanager = tmgr;

      // HTML entities
      view = document.getElementById('telephony-tab');
      smscount = document.getElementById('telephony-smscount');
      calltime = document.getElementById('telephony-calltime');
      time = document.getElementById('telephony-time');
      resetDate = document.getElementById('reset-date');

      window.addEventListener('localized', localize);

      // Configure showing tab
      var tabButton = document.getElementById('telephony-tab-filter');
      tabButton.addEventListener('click', function _showTab() {
        tabmanager.changeViewTo('telephony-tab');
      });

      // Configure updates
      document.addEventListener('mozvisibilitychange', updateWhenVisible, true);
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

    document.removeEventListener('mozvisibilitychange', updateWhenVisible);
    ConfigManager.removeObserver('lastTelephonyActivity', updateCounters);
    ConfigManager.removeObserver('lastTelephonyReset', updateUI);
    ConfigManager.removeObserver('nextReset', updateNextReset);

    initialized = false;
  }

  function updateWhenVisible() {
    if (!document.mozHidden && initialized) {
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
    time.innerHTML = formatTimeHTML(lastReset,
                                    settings.lastTelephonyActivity.timestamp);

  }

  function updateCounters(activity) {
    smscount.innerHTML = _('magnitude', {
      value: activity.smscount,
      unit: 'SMS'
    });
    calltime.innerHTML = _('magnitude', {
      value: computeTelephonyMinutes(activity),
      unit: 'min.'
    });
  }

  function updateNextReset(reset, old, key, settings) {
    if (settings.trackingPeriod === 'never') {
      resetDate.innerHTML = _('never');
    } else {
      var dateFormatter = new navigator.mozL10n.DateTimeFormat();
      var content = dateFormatter.localeFormat(settings.nextReset,
        _('short-date-format'));
      resetDate.innerHTML = content;
    }
  }

  return {
    initialize: setupTab,
    finalize: finalize
  };
}());
