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

  /**
   * Whether or not the root element associated with
   * this view is displayed.
   */
  displayed: function() {
    return this.getElement().displayed();
  },

  waitForDisplay: function() {
    return this.client.waitFor(this.displayed.bind(this));
  },

  /* Form helpers */

  setFormValue: function(name, value) {
    var formData = {};
    formData[name] = value;
    this.setFormData(formData);
  },

  setFormData: function(formData) {
    this.client.forms.fill(this.form, formData);
  }
};
