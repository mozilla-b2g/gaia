define(function(require) {
  'use strict';

  var template = require('templates/week');
  var Parent = require('./day_based');
  var _super = Parent.prototype;
  var dateFormat = require('utils/dateFormat');

  function Week(options) {
    Parent.apply(this, arguments);
    this.hourEventsSelector = null;

    this.allDayElement = document.createElement('section');
    this.allDayElement.classList.add('week-events');
  }

  Week.prototype = {
    __proto__: Parent.prototype,

    classType: 'week-events',

    template: template,

    outsideAllDay: false,

    _renderHeader: function() {
      var format = dateFormat.localeFormat(
        this.date,
        '%a %e'
      );
      return template.header.render({
        title: format
      });
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
      // we use 0.1rem as margin between events, otherwise consecutive events
      // would "blend". Need also to increase height to account for each border
      // between the hours, otherwise events that spans through multiple hours
      // would not be aligned properly
      var percHeight = (hoursDuration * 100) + '%';
      var remHeight = (Math.floor(hoursDuration) / 10) + 'rem';
      element.style.height = 'calc(' + percHeight + ' + ' + remHeight +
        ' - 0.1rem)';
    },

    create: function() {
      var el = _super.create.apply(this, arguments);

      this.stickyFrame.insertAdjacentHTML(
        'afterbegin',
        this._renderHeader()
      );

      this.stickyFrame.dataset.date = this.date;

      this.stickyFrame.appendChild(this.allDayElement);

      return el;
    }

  };

  return Week;

});
