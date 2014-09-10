'use strict';

var Marionette = require('marionette-client');

function View(client) {
  this.client = client.scope({ searchTimeout: 5000 });
  this.actions = new Marionette.Actions(client);
}
module.exports = View;

View.prototype = {
  /**
   * Namespaces a Marionette.Client#findElement call into this view.
   */
  findElement: function(selector) {
    return this
      .getElement()
      .findElement(selector);
  },

  findElements: function(selector) {
    return this
      .getElement()
      .findElements(selector);
  },

  /**
   * Grab the root element associated with this view.
   */
  getElement: function() {
    return this.client.findElement(this.selector);
  },

  get element() {
    return this.getElement();
  },

  /**
   * Whether or not the root element associated with
   * this view is displayed.
   */
  displayed: function() {
    return this.getElement().displayed();
  },

  waitForDisplay: function() {
    var waitFor = this.client.waitFor;
    // The default value of `mozHour12` is null[1],
    // so we need to make sure navigator.mozHour12 is ready(as true or false)
    // to avoid race condition issue.
    // [1] https://github.com/mozilla-b2g/gaia/blob/master/shared/js/date_time_helper.js#L15
    waitFor(function() {
      var mozHour12 = this.client.executeScript(function() {
        return window.wrappedJSObject.navigator.mozHour12;
      });
      return mozHour12 != null;
    }.bind(this));
    return waitFor(this.displayed.bind(this));
  },

  waitForHide: function() {
    return this.client.waitFor(function() {
      return !this.displayed();
    }.bind(this));
  },

  /* Form helpers */

  setFormValue: function(name, value) {
    var formData = {};
    formData[name] = value;
    this.setFormData(formData);

    // Send input event to trigger the listener method.
    // e.g. Set the start date to trigger doing auto change end date.
    this.form.findElement('[name="' + name + '"]')
      .scriptWith(function(el) {
        el.dispatchEvent(new CustomEvent('input'));
      });
  },

  setFormData: function(formData) {
    this.client.forms.fill(this.form, formData);
  },

  getFormValue: function(name) {
    return this.findElement('[name="' + name + '"]').getAttribute('value');
  }
};
