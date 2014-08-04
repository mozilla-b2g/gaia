Calendar.ns('Views').DayChild = (function() {
  'use strict';

  var template = Calendar.Templates.Day;
  var Parent = Calendar.Views.DayBased;

  function Day(options) {
    Parent.apply(this, arguments);

    this.controller = this.app.timeController;
    this.hourEventsSelector = template.hourEventsSelector;
  }

  Day.prototype = {

    __proto__: Parent.prototype,

    create: function() {
      Parent.prototype.create.apply(this, arguments);

      var container = this.element
        .querySelector('.day-events-wrapper > .day-events');
      this._currentTime = new Calendar.Views.CurrentTime({
        container: container,
        timespan: this.timespan
      });
    },

    activate: function() {
      Parent.prototype.activate.apply(this, arguments);

      this._currentTime.activate();
    },

    deactivate: function() {
      Parent.prototype.deactivate.apply(this, arguments);

      this._currentTime.deactivate();
    },

    destroy: function() {
      Parent.prototype.destroy.apply(this, arguments);

      this._currentTime.destroy();
    },

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
