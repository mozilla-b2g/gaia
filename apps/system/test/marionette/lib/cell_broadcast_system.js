
'use strict';
(function(module) {

  var CellBroadcastSystem = function(client) {
    this.client = client;
  };

  CellBroadcastSystem.prototype = {
    Selectors: {
      element: '#modal-dialog-alert'
    },

    get dialog() {
      return this.client.findElement(this.Selectors.element);
    },

    get visible() {
      return this.client.findElement(this.Selectors.element).displayed();
    },

    show: function(event) {
      this._mockMobile();
      this.client.executeScript(function(event) {
        window.wrappedJSObject.cellBroadcastSystem.show(event);
      }, [event]);
    },

    _mockMobile: function() {
      this.client.executeScript(function() {
        window.wrappedJSObject.navigator.mozMobileConnections = [];
      });
    }

  };

  module.exports = CellBroadcastSystem;
})(module);
