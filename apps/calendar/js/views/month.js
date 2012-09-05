Calendar.ns('Views').Month = (function() {

  var template = Calendar.Templates.Month;
  var Calc = Calendar.Calc;
  var Parent = Calendar.Views.TimeParent;

  /**
   * Creates an instance of a month.
   */
  function Month(options) {
    Parent.apply(this, arguments);
  }

  Month.prototype = {
    __proto__: Parent.prototype,

    selectors: {
      element: '#month-view',
      selectedDay: 'li.selected'
    },

    SELECTED: 'selected',

    _clearSelectedDay: function() {
      var day = this.element.querySelector(
        this.selectors.selectedDay
      );

      if (day) {
        day.classList.remove(this.SELECTED);
      }
    },

    _selectDay: function(date) {
      var el, id;
      this._clearSelectedDay();

      id = Calc.getDayId(date);
      id = this.currentChild._dayId(id);

      el = document.getElementById(id);
      if (el) {
        el.classList.add('selected');
      }
    },

    _initEvents: function() {
      var self = this;
      this.controller = this.app.timeController;


      Parent.prototype._initEvents.apply(this, arguments);

      this.controller.on('selectedDayChange', this);
      this.controller.on('monthChange', this);
      this.delegate(this.element, 'click', '[data-date]', this);
    },

    handleEvent: function(e, target) {
      Parent.prototype.handleEvent.apply(this, arguments);

      switch (e.type) {
        case 'click':
          var date = Calc.dateFromId(target.dataset.date);
          this.controller.selectedDay = date;
          break;
        case 'selectedDayChange':
          this._selectDay(e.data[0]);
          break;

        case 'monthChange':
          this._clearSelectedDay();
          this._activateTime(e.data[0]);
          break;
      }
    },

    _createChild: function(time) {
      return new Calendar.Views.MonthChild({
        app: this.app,
        date: time
      });
    },

    _getId: function(date) {
      return date.valueOf();
    },

    /**
     * Moves calendar to the next month.
     */
    _nextTime: function(time) {
      return new Date(
        time.getFullYear(),
        time.getMonth() + 1,
        time.getDate()
      );
    },

    /**
     * Moves calendar to the next month.
     */
    _previousTime: function(time) {
      return new Date(
        time.getFullYear(),
        time.getMonth() - 1,
        time.getDate()
      );
    },

    /**
     * Render current month
     */
    render: function() {
      var time = this.controller.month;
      this._activateTime(time);
    }

  };

  Month.prototype.onfirstseen = Month.prototype.render;

  return Month;

}(this));
