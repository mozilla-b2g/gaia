define(function(require) {
  'use strict';

  var calc = require('calc');

  /**
   * This is a more crude version of what asuth does in email.
   * Right now this class is here only for debugging sync issues.
   * We need to add the settings so we can optionally turn this on.
   */
  function EventLogger() {
    this.events = Object.create(null);
    this.occurs = Object.create(null);

    this.richLog = {};
  }

  EventLogger.prototype = {

    displayLog: function(id, string) {
      if (!(id in this.richLog)) {
        this.richLog[id] = [];
      }
      this.richLog[id].push(string);
    },

    addEvent: function(event) {
      var id = event.id;
      this.events[id] = event;
      var log = this.formatEvent(event);
      this.displayLog(id, log);
    },

    addBusytime: function(busy) {
      var id = busy.eventId;
      this.occurs[id] = busy;
      this.displayLog(id, this.formatBusytime(busy));
    },

    formatEvent: function(event) {
      var format = [
        'add event: (' + event.id + ')',
        'title:' + event.title,
        'start:' + (calc.dateFromTransport(event.start)).toString(),
        'end:' + (calc.dateFromTransport(event.end)).toString(),
        'isException:' + event.isException
      ];

      return format.join(' || ');
    },

    formatBusytime: function(busy) {
      var event = this.events[busy.eventId];
      var title = 'busytime for event: ' + busy.eventId;

      if (event) {
        title = 'busytime for event: ' + event.title;
      }

      var format = [
        title,
        'start:' + (calc.dateFromTransport(busy.start)).toString(),
        'end:' + (calc.dateFromTransport(busy.end)).toString(),
        'isException:' + busy.isException
      ];

      return format.join(' || ');
    }

  };

  return EventLogger;
});
