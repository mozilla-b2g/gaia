/* global System, BaseUI */
'use strict';

(function() {
  var UsbCore = function() {};
  BaseModule.create(UsbCore, {
    name: 'UsbCore',
    _start: function() {
      this.icon = new UsbIcon(this);
      this.icon.start();
    },
    _stop: function() {
      this.icon && this.icon.stop();
    },
    _handle_mozChromeEvent: function() {
      switch (evt.detail.type) {
        case 'volume-state-changed':
          this.umsActive = evt.detail.active;
          this.icon && this.icon.update();
          break;
      }
    }
  });
}());
