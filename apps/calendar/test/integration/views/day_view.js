function DayView(app) {
  CalendarView.apply(this, arguments);

  var root = app.selectors[this.viewSelector];

  this.selectors = {
    activeChildren: root + ' .active[data-date]'
  };
}

DayView.prototype = {
  __proto__: CalendarView.prototype,

  viewSelector: 'dayView',
  url: '/day/',

  /**
   * Navigate to this view.
   */
  navigate: function(callback) {
    this.app.task(function(app, next, done) {
      yield app.device.executeScript(
        'window.wrappedJSObject.Calendar.App.go("' + this.url + '");'
      );

      var el = yield this._findElement('_element', this.viewSelector, next);
      yield app.waitUntilElement(el, 'displayed');

      done();
    }, callback, this);
  },

  /**
   * Swipes forward.
   */
  forward: function(callback) {
    this.swipe('right', callback);
  },

  /**
   * Swipes back.
   */
  back: function(callback) {
    this.swipe('left', callback);
  },

  /**
   * Returns all active dates in the week view.
   *
   *    var dates = yield app.weekView.activeDates();
   *
   *    // dates =>
   *    // [ new Date(....), ... ]
   *
   * @param {Function} [callback] optional callback.
   */
  activeDates: function(callback) {
    this.app.task(function(app, next, done) {
      var elements = yield app.device.findElements(
        this.selectors.activeChildren
      );

      var dates = [];
      var i = 0;
      var len = elements.length;

      for (; i < len; i++) {
        dates.push(
          // we push a standard date format into data-date
          // specifically for testing/debugging.
          new Date(yield elements[i].getAttribute('data-date'))
        );
      }

      done(null, dates);
    }, callback, this);
  }

};

