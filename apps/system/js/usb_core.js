/* global BaseModule, UsbIcon, LazyLoader */
'use strict';

(function() {
  var UsbCore = function() {};
  UsbCore.EVENTS = ['mozChromeEvent'];
  BaseModule.create(UsbCore, {
    name: 'UsbCore',
    _start: function() {
      LazyLoader.load(['js/usb_icon.js']).then(function() {
        this.icon = new UsbIcon(this);
        this.icon.start();
      }.bind(this)).catch(function(err) {
        console.error(err); 
      });
    },
    _stop: function() {
      this.icon && this.icon.stop();
    },
    _handle_mozChromeEvent: function(evt) {
      switch (evt.detail.type) {
        case 'volume-state-changed':
          this.umsActive = evt.detail.active;
          this.icon && this.icon.update();
          break;
      }
    }
  });
}());
