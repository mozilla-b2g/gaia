
'use strict';
(function(module) {
  var AmbientIndicator = function(client) {
    this.client = client;
  };

  AmbientIndicator.prototype = {
    Selectors: {
      element: '#ambient-indicator'
    },

    get displayed() {
      return this.client.findElement(this.Selectors.element).displayed();
    },

    waitForDisplayed: function() {
      this.client.helper.waitForElement(this.Selectors.element);
    },

    waitForHidden: function() {
      this.client.helper.waitForElementToDisappear(this.Selectors.element);
    }

  };

  module.exports = AmbientIndicator;
})(module);
