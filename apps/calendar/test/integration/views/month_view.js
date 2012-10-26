function MonthView(app) {
  CalendarView.apply(this, arguments);
}

MonthView.prototype = {
  __proto__: CalendarView.prototype,

  /**
   * Navigate to this view.
   */
  navigate: function(callback) {
    this.app.task(function(app, next, done) {
      yield app.device.executeScript(
        'window.wrappedJSObject.Calendar.App.go("/month/");'
      );

      var el = yield this._findElement('_element', 'monthView', next);
      yield app.waitUntilElement(el, 'displayed');

      done();
    }, callback, this);
  },

  /**
   * Finds the element representing a
   * given date. Will not navigate
   * the calendar to new months only search
   * the existing display of days.
   *
   * @param {Date} date relative to display.
   */
  dateElement: function(date, callback) {
    this.app.task(function(app, next, done) {
      var parent = yield this._findElement('_element', 'monthView', next);

      var id = Calendar.Calc.getDayId(date);
      var dayEl = yield parent.findElement('[data-date="' + id + '"]', next);

      done(null, dayEl);
    }, callback, this);
  }

};
