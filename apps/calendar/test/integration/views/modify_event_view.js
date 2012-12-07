/**
 * Helper class that wraps common operations for
 * the "modify event" view which handles adding/updating/deleting.
 */
function ModifyEventView(app) {
  CalendarView.apply(this, arguments);
  this.app = app;
}

ModifyEventView.prototype = {
  __proto__: CalendarView.prototype,

  viewSelector: 'modifyEventView',

  /**
   * Waits until the element is visible again.
   */
  waitUntilVisible: function(callback) {
    this.app.task(function(app, next, done) {
      var device = app.device;
      var el = yield this._findElement('_element', this.viewSelector, next);
      var displayed = yield app.waitUntilElement(el, 'displayed');
      done(null, displayed);
    }, callback, this);

  },

  /**
   * Checks if the view is visible.
   */
  displayed: function(callback) {
    this.app.task(function(app, next, done) {
      var device = app.device;
      var el = yield this._findElement('_element', this.viewSelector, next);
      var displayed = yield el.displayed(next);

      done(null, displayed);
    }, callback, this);
  },

  /**
   * Clicks add event button and waits until view is visible.
   */
  add: function(callback) {
    this.app.task(function(app, next, done) {
      var add = yield this._findElement('_addButton', 'addEventBtn', next);
      yield add.click(next);

      var el = yield this._findElement('_element', this.viewSelector, next);

      yield app.waitUntilElement(el, 'displayed');
      done(null, el);
    }, callback, this);
  },

  remove: function(callback) {
    this.app.task(function(app, next, done) {
      var remove =
        yield this._findElement('_deleteButton', 'eventDeleteBtn', next);

      yield remove.click();

      done();
    }, callback, this);
  },

  /**
   * Clicks the save button.
   */
  save: function(callback) {
    this.app.task(function(app, next, done) {
      var save = yield this._findElement('_saveButton', 'eventSaveBtn', next);
      yield save.click(next);
      done();
    }, callback, this);
  },

  /**
   * Returns the values of the form.
   */
  values: function(callback) {
    this.app.task(function(app, next, done) {
      var values = yield app.formValues('eventFormFields');
      done(null, values);
    }, callback, this);
  },

  /**
   * Updates but does not save the form values.
   *
   * @param {Object} values key/value pair.
   */
  update: function(values, callback) {
    this.app.task(function(app, next, done) {
      var form = yield this._findElement('_form', 'eventForm', next);
      yield app.updateForm(form, values);
      done();
    }, callback, this);
  }

};
