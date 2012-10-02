Calendar.ns('Views').WeekChild = (function() {

  var template = Calendar.Templates.Week;
  var OrderedMap = Calendar.OrderedMap;
  var _super = Calendar.Views.DayChild.prototype;

  function Week(options) {
    Calendar.Views.DayChild.apply(this, arguments);
    this.hourEventsSelector = null;
  }

  Week.prototype = {
    __proto__: Calendar.Views.DayChild.prototype,


    classType: 'week-events',

    _renderHeader: function() {
      var format = this.app.dateFormat.localeFormat(
        this.date,
        '%a %e'
      );
      return template.header.render(format);
    },

    _renderEvent: function(event) {
      return template.event.render({
        calendarId: event.calendarId,
        eventId: event._id,
        title: event.remote.title
      });
    },

    _insertHour: function(hour) {
      this.hours.indexOf(hour);

      var len = this.hours.items.length;
      var idx = this.hours.insertIndexOf(hour);

      var html = template.hour.render({
        hour: String(hour)
      });

      var el = this._insertElement(
        html,
        this.events,
        this.hours.items,
        idx
      );

      return {
        element: el,
        records: new OrderedMap(),
        flags: []
      };
    },

    create: function() {
      var el = _super.create.apply(this, arguments);

      el.insertAdjacentHTML(
        'afterbegin',
        this._renderHeader()
      );

      return el;
    }

  };

  return Week;

}(this));
