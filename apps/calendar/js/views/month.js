Calendar.ns('Views').Month = (function() {
  'use strict';

  var Calc = Calendar.Calc;
  var Parent = Calendar.Views.TimeParent;

  /**
   * Creates an instance of a month.
   */
  function Month(options) {
    Parent.apply(this, arguments);
    // default to today
    this._selectedDay = new Date();
  }

  Month.prototype = {
    __proto__: Parent.prototype,

    scale: 'month',

    selectors: {
      element: '#month-view',
      selectedDay: 'li.selected'
    },

    childClass: Calendar.Views.MonthChild,

    SELECTED: 'selected',

    /** @type {DOMElement} used to detect if dbltap happened on same date */
    _lastTarget: null,

    _onswipe: function() {
      var didSwipe = Parent.prototype._onswipe.apply(this, arguments);

      // If we changed months, set the selected day to the 1st
      if (didSwipe) {
        this.controller.selectedDay = this.date;
      }
    },

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
      id = this.currentFrame._dayId(id);

      el = document.getElementById(id);

      if (el) {
        el.classList.add(this.SELECTED);
        this._selectedDay = date;
      }
    },

    _initEvents: function() {
      this.controller = this.app.timeController;

      Parent.prototype._initEvents.apply(this, arguments);

      this.controller.on('selectedDayChange', this);
      this.controller.on('monthChange', this);
      this.delegate(this.element, 'click', '[data-date]', this);
      this.delegate(this.element, 'dbltap', '[data-date]', this);
    },

    handleEvent: function(e, target) {
      Parent.prototype.handleEvent.apply(this, arguments);

      switch (e.type) {
        case 'click':
          var date = Calc.dateFromId(target.dataset.date);
          this.controller.selectedDay = date;
          break;
        case 'dbltap':
          // make sure we discard double taps that started on a different day
          if (this._lastTarget === target) {
            this._goToAddEvent();
          }
          break;
        case 'selectedDayChange':
          this._selectDay(e.data[0]);
          break;
        case 'monthChange':
          this._clearSelectedDay();
          this.changeDate(e.data[0]);
          break;
      }
      this._lastTarget = target;
    },

    _goToAddEvent: function(date) {
      // slight delay to avoid tapping the elements inside the add event screen
      setTimeout(() => {
        // don't need to set the date since the first tap triggers a click that
        // sets the timeController.selectedDay
        this.app.go('/event/add/');
      }, 50);
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
      this.changeDate(time);
    }

  };

  Month.prototype.onfirstseen = Month.prototype.render;

  return Month;

}(this));
