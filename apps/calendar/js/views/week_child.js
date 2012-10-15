Calendar.ns('Views').WeekChild = (function() {

  var template = Calendar.Templates.Week;
  var OrderedMap = Calendar.OrderedMap;
  var _super = Calendar.Views.DayBased.prototype;

  function Week(options) {
    Calendar.Views.DayBased.apply(this, arguments);
    this.hourEventsSelector = null;
  }

  Week.prototype = {
    __proto__: Calendar.Views.DayBased.prototype,

    classType: 'week-events',

    template: template,

    outsideAllDay: false,

    _renderHeader: function() {
      var format = this.app.dateFormat.localeFormat(
        this.date,
        '%a %e'
      );
      return template.header.render(format);
    },

    _renderEvent: function(event) {
      var render = template.event.render({
        calendarId: event.calendarId,
        eventId: event._id,
        title: event.remote.title
      });

      return render;
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
