'use strict';

/* global module */

var SELECTORS = Object.freeze({
  container: 'form[data-type=confirm][data-subtype=menu][role=dialog]',
  // The following rules should be scoped by the container.
  header: 'form h1',
  body: 'form p',
  button: 'form button'
});

function DialogAccessor(client) {
  this.client = client;
}

DialogAccessor.prototype = {
  get container() {
    return this.client.helper.waitForElement(SELECTORS.container);
  },

  get buttons() {
    return this.container.findElements(SELECTORS.button);
  },

  get header() {
    return this.container.findElement(SELECTORS.header);
  },

  get body() {
    return this.container.findElement(SELECTORS.body);
  },

  waitToAppear: function() {
    this.client.waitFor(function() {
      var body = this.client.findElement('body');

      return this.container.getAttribute('class').indexOf('visible') >= 0 &&
        body.getAttribute('class').indexOf('dialog-animating') < 0;
    }.bind(this));
  }
};

module.exports = DialogAccessor;
