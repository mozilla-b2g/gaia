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

    _initEvents: function() {
      var self = this;
      this.controller.on('selectedDayChange', this);
      this.delegate(this.events, 'click', '[data-id]', function(e, target) {
        Calendar.App.router.show('/event/' + target.dataset.id + '/');
      });
    },

    handleEvent: function(e) {
      Parent.prototype.handleEvent.apply(this, arguments);

      switch (e.type) {
        case 'selectedDayChange':
          this.changeDate(e.data[0]);
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
