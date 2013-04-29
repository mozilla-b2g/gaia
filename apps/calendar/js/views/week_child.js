Calendar.ns('Views').WeekChild = (function() {

  var template = Calendar.Templates.Week;
  var OrderedMap = Calendar.Utils.OrderedMap;
  var _super = Calendar.Views.DayBased.prototype;

  function Week(options) {
    Calendar.Views.DayBased.apply(this, arguments);
    this.hourEventsSelector = null;

    this.allDayElement = document.createElement('section');
    this.allDayElement.classList.add('week-events');
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

    _renderEvent: function(busytime, event) {
      var render = template.event.render({
        calendarId: event.calendarId,
        busytimeId: busytime._id,
        title: event.remote.title
      });

      return render;
    },

    /**
     * Assigns an element's height in the week view, overrides base class to
     * account for a discrepancy in height calculation introduced by margins in
     * CSS.
     *
     * @param {HTMLElement} element target to apply top/height to.
     * @param {Numeric} duration in hours, minutes as decimal part.
     */
    _assignHeight: function(element, hoursDuration) {
      var percHeight = hoursDuration * 100;

      // TODO: This is a magic calculation based on current CSS. Fix this so
      // that it can be dynamic based on CSS, or fix CSS to not need this.
      var pxHeight = (hoursDuration * 2) - 5;

      element.style.height = 'calc(' + percHeight + '% + ' + pxHeight + 'px)';
    },

    create: function() {
      var el = _super.create.apply(this, arguments);

      this.stickyFrame.insertAdjacentHTML(
        'afterbegin',
        this._renderHeader()
      );

      this.stickyFrame.appendChild(this.allDayElement);

      return el;
    }

  };

  return Week;

}(this));
