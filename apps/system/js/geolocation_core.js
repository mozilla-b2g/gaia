/* global BaseModule, GeolocationIcon, LazyLoader */
'use strict';

(function() {
  var GeolocationCore = function() {};
  GeolocationCore.EVENTS = [
    'mozChromeEvent'
  ];
  BaseModule.create(GeolocationCore, {
    name: 'GeolocationCore',
    _start: function() {
      LazyLoader.load(['js/geolocation_icon.js']).then(function() {
        this.icon = new GeolocationIcon(this);
        this.icon.start();
      }.bind(this)).catch(function(err) {
        console.error(err);
      });
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
