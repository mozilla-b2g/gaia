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

    _renderEvent: function(object) {
      var remote = object.remote;
      var attendees;

      if (object.remote.attendees) {
        attendees = this._renderAttendees(
          object.remote.attendees
        );
      }

      return template.event.render({
        eventId: object._id,
        calendarId: object.calendarId,
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
