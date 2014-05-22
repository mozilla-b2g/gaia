Calendar.ns('Views').WeekChild = (function() {
  'use strict';

  var template = Calendar.Templates.Week;
  var _super = Calendar.Views.DayBased.prototype;
  var PrevElement = null;

  function Week(options) {
    Calendar.Views.DayBased.apply(this, arguments);
    this.hourEventsSelector = null;

    this.allDayElement = document.createElement('section');
    this.allDayElement.classList.add('week-events');
    this.controller = this.app.timeController;
    this.controller.on('scaleChange', this);
  }

  Week.prototype = {
    __proto__: Calendar.Views.DayBased.prototype,

    classType: 'week-events',

    template: template,

    outsideAllDay: true,

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
      this.delegate(this.allDayElement, 'click', 'ol.hour',
        this._onFirstClick.bind(this));
      this.delegate(el, 'click', 'ol.hour',
        this._onFirstClick.bind(this));

      return el;
    },

    _clearSelectedDay: function(ele) {
      if (ele) {
        ele.classList.remove(this.SELECTED);
        this.firstClick = false;
      }
    },

    _selectDay: function(el) {
      if (PrevElement) {
        this._clearSelectedDay(PrevElement);
      }
      if (el) {
        el.classList.add(this.SELECTED);
        this.firstClick = true;
        PrevElement = el;
      }
    },


    _onFirstClick: function(evt, el) {
      if (this._clickedOnEvent(evt.target)) {
	  this._clearSelectedDay(PrevElement);
        // We just clicked on an event... bail!
        return;
      }
      var hour = el.getAttribute('data-hour');
      if (!hour) {
        // Something went terribly wrong...
        return;
      }

      if ((PrevElement === el) && this.firstClick) {
        this._clearSelectedDay(el);
        this._onHourClick(evt, el);
      } else {
          this._selectDay(el);
        }
    },

  _clickedOnEvent: function(target) {
      var el = target;
      while (el && el.nodeType === 1 /** ELEMENT_NODE */) {
        if (el.classList.contains('event')) {
          return true;
        }
        if (el.classList.contains('events')) {
          return false;
        }
        el = el.parentNode;
      }
      return true;
    },

    handleEvent: function(e) {
      switch (e.type) {
        case 'scaleChange':
          this._clearSelectedDay(PrevElement);
      }
  }

  };

  return Week;

}(this));
