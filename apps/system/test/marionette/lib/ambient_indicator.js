
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
    }

  };

  module.exports = AmbientIndicator;
})(module);
