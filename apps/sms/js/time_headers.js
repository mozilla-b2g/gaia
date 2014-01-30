/*global Utils */
(function(exports) {
  'use strict';

  var updateTimer = null;

  var TimeHeaders = {
    init: function th_init() {
      onvisibilityChange();
      document.addEventListener('visibilitychange', onvisibilityChange);
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
    update: function th_update(header) {
      var ts = header.dataset.time;
      if (!ts) {
        return;
      }

      var newHeader;

      // only date
      if (header.dataset.isThread === 'true') {
        newHeader = Utils.getHeaderDate(ts);

      // only time
      } else if (header.dataset.timeOnly === 'true') {
        newHeader = Utils.getFormattedHour(ts);

      // date + time
      } else {
        newHeader = Utils.getHeaderDate(ts) + ' ' + Utils.getFormattedHour(ts);
      }

      if (newHeader !== header.textContent) {
        header.textContent = newHeader;
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

  exports.TimeHeaders = TimeHeaders;
}(this));
