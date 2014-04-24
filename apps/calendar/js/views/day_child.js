/*global Calendar*/
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
      var remote = event.remote;
      var attendees;

      if (remote.attendees) {
        attendees = this._renderAttendees(
          remote.attendees
        );
      }

      return template.event.render({
        hasAlarm: Boolean(remote.alarms && remote.alarms.length),
        busytimeId: busytime._id,
        calendarId: event.calendarId,
        title: remote.title,
        location: remote.location,
        attendees: attendees
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
