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
      .element
      .findElement(selector);
  },

  findElements: function(selector) {
    return this
      .element
      .findElements(selector);
  },

  /**
   * Grab the root element associated with this view.
   */
  get element() {
    return this.client.findElement(this.selector);
  },

  /**
   * Whether or not the root element associated with
   * this view is displayed.
   */
  displayed: function() {
    return this.element.displayed();
  },

  waitForDisplay: function() {
    return this.client.waitFor(this.displayed.bind(this));
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
  },

  setFormData: function(formData) {
    this.client.forms.fill(this.form, formData);
  }
};
