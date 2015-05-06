/* global BaseIcon */
'use strict';

(function(exports) {
  var GeolocationIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  GeolocationIcon.prototype = Object.create(BaseIcon.prototype);
  GeolocationIcon.prototype.name = 'GeolocationIcon';
  GeolocationIcon.prototype.kActiveIndicatorTimeout = 5000;
  GeolocationIcon.prototype.update = function() {
    clearTimeout(this.geolocationTimer);

    var icon = this.element;
    if (!icon || !this.enabled()) {
      return;
    }
    icon.dataset.active = !!this.manager.active;

    if (this.manager.active) {
      // Geolocation is currently active, show the active icon.
      this.show();
      return;
    }

    // Geolocation is currently inactive.
    // Show the inactive icon and hide it after kActiveIndicatorTimeout
    this.geolocationTimer = setTimeout(function hideGeolocationIcon() {
      this.hide();
    }.bind(this), this.kActiveIndicatorTimeout);

    // The icon active state may have changed (visually indicated by its
    // opacity) in the maximised status bar, so we still need this call to
    // refresh the minimised status bar so that it looks like the maximised.
    this.publish('changed');
  };
  exports.GeolocationIcon = GeolocationIcon;
}(window));

