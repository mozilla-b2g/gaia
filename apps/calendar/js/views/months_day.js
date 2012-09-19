Calendar.ns('Views').MonthsDay = (function() {

  var Parent = Calendar.Views.DayChild;

  function MonthsDay() {
    Parent.apply(this, arguments);
  }

  MonthsDay.prototype = {
    __proto__: Parent.prototype,

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
      var date = this.date;

      var l10n = navigator.mozL10n;

      var dayName = l10n.get('weekday-' + date.getDay() + '-long');
      var monthName = l10n.get('month-' + date.getMonth() + '-long');

      dayName = dayName || date.toLocaleFormat('%A');
      monthName = monthName || date.toLocaleFormat('%B');

      var header = dayName + ' ' + monthName + ' ' + date.getDate();
      this.header.textContent = header;
    },

    handleEvent: function(e) {
      Parent.prototype.handleEvent.apply(this, arguments);

      switch (e.type) {
        case 'selectedDayChange':
          this.changeDate(e.data[0]);
          this._updateHeader();
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
