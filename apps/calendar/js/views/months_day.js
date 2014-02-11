Calendar.ns('Views').MonthsDay = (function() {

  var Parent = Calendar.Views.DayChild;

  function MonthsDay() {
    Parent.apply(this, arguments);
  }

  MonthsDay.prototype = {
    __proto__: Parent.prototype,

    renderAllHours: false,

    selectors: {
      element: '#months-day-view',
      events: '.day-events',
      currentDate: '#event-list-date'
    },

    get element() {
      return this._findElement('element');
    },

    get events() {
      return this._findElement('events');
    },

    get currentDate() {
      return this._findElement('currentDate');
    },

    get allDayElement() {
      return this.events;
    },

    changeDate: function(date) {
      Parent.prototype.changeDate.apply(this, arguments);
      var currentDate = this.currentDate;
      currentDate.innerHTML =
        navigator.mozL10n.get('weekday-' + date.getDay() + '-long') + ', ' +
        navigator.mozL10n.get('month-' + date.getMonth() + '-short') + ' ' +
        date.getDate();
    },

    _initEvents: function() {
      var self = this;
      this.controller.on('selectedDayChange', this);
      this.delegate(this.events, 'click', '[data-id]', function(e, target) {
        Calendar.App.router.show('/event/show/' + target.dataset.id + '/');
      });
    },

    handleEvent: function(e) {
      Parent.prototype.handleEvent.apply(this, arguments);

      switch (e.type) {
        case 'selectedDayChange':
          this.changeDate(e.data[0], true);
          break;
      }
    },

    create: function() {},

    render: function() {
      this._initEvents();
      var date = Calendar.Calc.createDay(new Date());
      this.changeDate(date);
    }
  };

  MonthsDay.prototype.onfirstseen =
    MonthsDay.prototype.render;

  return MonthsDay;

}());
