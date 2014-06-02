Calendar.ns('Views').DayChild = (function() {
  'use strict';

  var template = Calendar.Templates.Day;

  function Day(options) {
    Calendar.Views.DayBased.apply(this, arguments);

    this.controller = this.app.timeController;
    this.hourEventsSelector = template.hourEventsSelector;
  }

  Day.prototype = {

    __proto__: Calendar.Views.DayBased.prototype,

    _renderEvent: function(busytime, event) {
      var attendees;

      if (event.remote.attendees) {
        attendees = this._renderAttendees(
          event.remote.attendees
        );
      }

      return template.event.render({
        hasAlarm: !!(event.remote.alarms && event.remote.alarms.length),
        busytimeId: busytime._id,
        calendarId: event.calendarId,
        title: event.remote.title,
        location: event.remote.location,
        attendees: attendees,
        startTime: Calendar.App.dateFormat.localeFormat(
          busytime.startDate, navigator.mozL10n.get('shortTimeFormat')),
        endTime: Calendar.App.dateFormat.localeFormat(
          busytime.endDate, navigator.mozL10n.get('shortTimeFormat'))
      });
    },

    _renderAttendees: function(list) {
      if (!(list instanceof Array)) {
        list = [list];
      }

      return template.attendee.renderEach(list).join(',');
    }
  };

  return Day;

}(this));
