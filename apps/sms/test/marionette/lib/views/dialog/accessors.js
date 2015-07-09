'use strict';

/* global module */

var SELECTORS = Object.freeze({
  main: 'form[data-type=confirm][data-subtype=menu][role=dialog]',
  button: 'form[data-type=confirm][role=dialog] button'
});

function DialogAccessor(client) {
  this.client = client;
}

DialogAccessor.prototype = {
  get buttons() {
    return this.client.findElements(SELECTORS.button);
  },

  waitToAppear: function() {
    this.client.waitFor(function() {
      var container = this.client.helper.waitForElement(SELECTORS.main);
      var body = this.client.findElement('body');

      return container.getAttribute('class').indexOf('visible') >= 0 &&
        body.getAttribute('class').indexOf('dialog-animating') < 0;
    }.bind(this));
  }
};

module.exports = DialogAccessor;
