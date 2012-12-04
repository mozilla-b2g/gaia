function CalendarView(app) {
  this.app = app;
}

CalendarView.prototype = {

  /**
   * Swipes the view a particular direction.
   *
   * @param {String} dir (left or right).
   */
  swipe: function(dir, callback) {
    this.app.task(function(app, next, done) {
      var el = yield this._findElement('_element', this.viewSelector, next);
      yield app.waitUntilElement(el, 'displayed');
      yield app.swipe(el, dir);
      done();
    }, callback, this);
  },

  /**
   * Shortcut method to return a cached element or find it.
   *
   * @param {String} name of property on this.
   * @param {String} alias name of the selector.
   * @param {Function} [callback] optional callback.
   */
  _findElement: function(name, alias, callback) {
    var self = this;
    if (!(name in this)) {
      this.app.element(alias, function(err, element) {
        if (err) {
          callback(err);
          return;
        }

        self[name] = element;
        callback(null, element);
      });
    } else {
      // generator callback must be async.
      // This is fairly lame...
      setTimeout(function() {
        callback(null, self[name]);
      }, 0);
    }
  }

};
