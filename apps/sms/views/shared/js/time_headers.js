/*global Utils */
(function(exports) {
  'use strict';

  var updateTimer = null;

  var TimeHeaders = {
    init: function th_init() {
      onvisibilityChange();
      document.addEventListener('visibilitychange', onvisibilityChange);
      window.addEventListener('timeformatchange', ontimeFormatChange);
      window.addEventListener('languagechange', onlanguageChange);
    },
    startScheduler: function th_startScheduler() {
      var now = Date.now(),
          nextTimeout = new Date(now + 60000);
      nextTimeout.setSeconds(0);
      nextTimeout.setMilliseconds(0);

      // stop updateTimer first
      this.stopScheduler();

      // then register a new one
      updateTimer = setTimeout(function() {
        this.updateAll('header[data-time-update=repeat]');
        this.startScheduler();
      }.bind(this), nextTimeout.getTime() - now);
    },
    stopScheduler: function th_stopScheduler() {
      clearTimeout(updateTimer);
    },
    updateAll: function th_updateAll(selector) {
      selector = selector || '[data-time-update]';
      var elements = document.querySelectorAll(selector),
          length = elements.length,
          i;

      for (i = 0; i < length; i++) {
        this.update(elements[i]);
      }
    },
    update: function th_update(element) {
      var ts = element.dataset.time;
      if (!ts) {
        return;
      }

      // only date
      if (element.dataset.dateOnly === 'true') {
        Utils.setHeaderDate({
          time: ts,
          element: element,
          withTime: false
        });

      // only time
      } else if (element.dataset.timeOnly === 'true') {
        element.removeAttribute('data-l10n-id');
        element.textContent = Utils.getFormattedHour(ts);

      // date + time
      } else {
        Utils.setHeaderDate({
          time: ts,
          element: element,
          withTime: true
        });
      }
    }
  };

  function onvisibilityChange() {
    if (document.hidden) {
      TimeHeaders.stopScheduler();
    }
    else {
      TimeHeaders.updateAll();
      TimeHeaders.startScheduler();
    }
  }

  function ontimeFormatChange() {
    Utils.resetDateFormatters();
    TimeHeaders.updateAll();
  }

  function onlanguageChange() {
    Utils.resetDateFormatters();
    TimeHeaders.updateAll();
  }

  exports.TimeHeaders = TimeHeaders;
}(this));
