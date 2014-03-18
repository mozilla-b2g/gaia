Calendar.ns('Views').DayChild = (function() {

  var template = Calendar.Templates.Day;
  var OrderedMap = Calendar.Utils.OrderedMap;

  function Day(options) {
    Calendar.Views.DayBased.apply(this, arguments);

    this.controller = this.app.timeController;
    this.hourEventsSelector = template.hourEventsSelector;
  }

  Day.prototype = {

    __proto__: Calendar.Views.DayBased.prototype,

    _renderEvent: function(busytime, event) {
      var remote = event.remote;
      var classes;

      if (event.remote.alarms && event.remote.alarms.length) {
        classes = 'has-alarms';
      }

      return template.event.render({
        classes: classes,
        busytimeId: busytime._id,
        calendarId: event.calendarId,
        title: event.remote.title,
        location: event.remote.location
      });
    }

  };

  return Day;

}(this));
