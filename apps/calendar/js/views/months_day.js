Calendar.ns('Views').MonthsDay = (function() {

  var Parent = Calendar.Views.DayChild;

  function MonthsDay() {
    Parent.apply(this, arguments);
  }

  MonthsDay.prototype = {
    __proto__: Parent.prototype,

    inactiveClass: 'inactive',

    selectors: {
      element: '#months-day-view',
      events: '.day-events',
      header: '.day-title'
    },

    get element() {
      return this._findElement('element');
    },

    get events() {
      return this._findElement('events');
    },

    get allDayElement() {
      return this.events;
    },

    get header() {
      return this._findElement('header');
    },

    _initEvents: function() {
      var self = this;
      this.controller.on('selectedDayChange', this);
      this.delegate(this.events, 'click', '[data-id]', function(e, target) {
        Calendar.App.router.show('/event/' + target.dataset.id + '/');
      });
    },

    _updateHeader: function() {
      var header = this.header;
      var template = navigator.mozL10n.get(
        'agenda-date-format'
      );

      template = template || '%A %e %B %Y';

      // maybe we should localize this output ?
      var format = this.app.dateFormat.localeFormat(
        this.date,
        template
      );

      header.textContent = format;
      header.dataset.date = this.date.toString();
      header.dataset.l10nDateFormat = template;
    },

    changeDate: function(date) {
      if (date) {
        this.element.classList.remove(this.inactiveClass);
      } else {
        this.element.classList.add(this.inactiveClass);
        return;
      }

      return Parent.prototype.changeDate.apply(this, arguments);
    },

    handleEvent: function(e) {
      switch (e.type) {
        case 'selectedDayChange':
          this.changeDate(e.data[0], true);
          this._updateHeader();
          break;
        default:
          // selectedDayChange is handled in the parent and does
          // virtually the same thing but can slow down rendering
          // since we need to fetch things twice....
          Parent.prototype.handleEvent.apply(this, arguments);
          break;
      }

    },

    create: function() {},

    render: function() {
      this._initEvents();
      var date = Calendar.Calc.createDay(new Date());
      this.changeDate(date);
      this._updateHeader();
    }
  };

  MonthsDay.prototype.onfirstseen =
    MonthsDay.prototype.render;

  return MonthsDay;

}());
