Calendar.ns('Views').DayChild = (function() {

  var template = Calendar.Templates.Day;
  var OrderedMap = Calendar.OrderedMap;

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

      if (event.remote.attendees) {
        attendees = this._renderAttendees(
          event.remote.attendees
        );
      }

      return template.event.render({
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
