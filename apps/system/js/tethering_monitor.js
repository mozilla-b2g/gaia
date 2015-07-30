/* global BaseModule, TetheringIcon, LazyLoader */
'use strict';

(function() {
  var TetheringMonitor = function() {};
  TetheringMonitor.SETTINGS = [
    'tethering.usb.enabled',
    'tethering.wifi.enabled',
    'tethering.wifi.connectedClients',
    'tethering.usb.connectedClients'
  ];
  BaseModule.create(TetheringMonitor, {
    name: 'TetheringMonitor',
    /**
     * Indicate if the tethering is enabled
     * @type {Boolean}
     */
    enabled: false,
    /**
     * Indicate there is active tethering client
     * @type {Boolean}
     */
    connected: false,
    _start: function() {
      LazyLoader.load(['js/tethering_icon.js']).then(function() {
        this.icon = new TetheringIcon(this);
        this.icon.start();
      }.bind(this)).catch(function(err) {
        console.error(err); 
      });
    },
    _stop: function() {
      this.icon && this.icon.stop();
    },
    '_observe_tethering.usb.enabled': function(value) {
      this.enabled = value || this._settings['tethering.wifi.enabled'];
      this.icon && this.icon.update();
    },
    '_observe_tethering.wifi.enabled': function(value) {
      this.enabled = value || this._settings['tethering.usb.enabled'];
      this.icon && this.icon.update();
    },
    '_observe_tethering.usb.connectedClients': function(value) {
      this.connected = (value > 0) ||
        (this._settings['tethering.wifi.connectedClients'] > 0);
      this.icon && this.icon.update();
    },
    '_observe_tethering.wifi.connectedClients': function(value) {
      this.connected = (value > 0) ||
        (this._settings['tethering.usb.connectedClients'] > 0);
      this.icon && this.icon.update();
    }
  });
}());
