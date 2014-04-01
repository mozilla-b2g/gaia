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

    hourSelector: 'section.hour',

    _renderEvent: function(busytime, event) {
      var attendees;
      var classes;

      if (event.remote.alarms && event.remote.alarms.length) {
        classes = 'has-alarms';
      }

      if (event.remote.attendees) {
        attendees = this._renderAttendees(
          event.remote.attendees
        );
      }

      return template.event.render({
        classes: classes,
        busytimeId: busytime._id,
        calendarId: event.calendarId,
        title: event.remote.title,
        location: event.remote.location,
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
