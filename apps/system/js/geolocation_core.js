/* global BaseModule */
'use strict';

(function() {
  var GeolocationCore = function() {};
  GeolocationCore.EVENTS = [
    'mozChromeEvent'
  ];
  BaseModule.create(GeolocationCore, {
    name: 'GeolocationCore',
    _start: function() {
      this.icon = new GeolocationIcon(this);
    },
    _handle_mozChromeEvent: function(evt) {
      switch (evt.detail.type) {
        case 'geolocation-status':
          this.active = evt.detail.active;
          this.icon && this.icon.update();
          break;
      }
    }
  });
}());
