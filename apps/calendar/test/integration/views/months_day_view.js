function MonthsDayView(app) {
  CalendarView.apply(this, arguments);
}

MonthsDayView.prototype = {
  __proto__: CalendarView.prototype,

  viewSelector: 'monthsDayView',

  /**
   * Finds an event in the months day view by its title.
   *
   * @param {String} title of event.
   */
  eventByTitle: function(title, callback) {
    this.app.task(function(app, next, done) {
      // parent view
      var parent = yield this._findElement('_element', this.viewSelector, next);
      var el = yield parent.findElement('//*[text()="' + title + '"]', 'xpath');

      done(null, el);
    }, callback, this);
  }
};
