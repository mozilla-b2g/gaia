/* global System, BaseUI */
'use strict';

(function(exports) {
  var GeolocationIcon = function(manager) {
    this.manager = manager;
  };
  GeolocationIcon.prototype = Object.create(BaseUI.prototype);
  GeolocationIcon.prototype.constructor = GeolocationIcon;
  GeolocationIcon.prototype.EVENT_PREFIX = 'geolocationicon';
  GeolocationIcon.prototype.containerElement = document.getElementById('statusbar');
  GeolocationIcon.prototype.view = function() {
    return '<div id="' + this.instanceID + '" class="sb-icon sb-icon-geolocation" hidden ' +
            'role="listitem" data-l10n-id="statusbarGeolocation"></div>'
  };
  GeolocationIcon.prototype.instanceID = 'statusbar-geolocation';
  GeolocationIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  GeolocationIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  GeolocationIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  GeolocationIcon.prototype.start = function() {
    window.addEventListener('mozChromeEvent', this);
  };
  GeolocationIcon.prototype.stop = function() {
    window.removeEventListener('mozChromeEvent', this);
  };
  GeolocationIcon.prototype.handleEvent = function() {
    switch (evt.detail.type) {
      case 'geolocation-status':
        this.geolocationActive = evt.detail.active;
        this.update();
        break;
    }
  };
  GeolocationIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  GeolocationIcon.prototype.update = function() {
    clearTimeout(this.geolocationTimer);

    var icon = this.element
    icon.dataset.active = !!this.geolocationActive;

    if (this.geolocationActive) {
      // Geolocation is currently active, show the active icon.
      icon.hidden = false;
      this.manager._updateIconVisibility();
      return;
    }

    // Geolocation is currently inactive.
    // Show the inactive icon and hide it after kActiveIndicatorTimeout
    this.geolocationTimer = setTimeout(function hideGeolocationIcon() {
      icon.hidden = true;
      this.manager._updateIconVisibility();
    }.bind(this), this.kActiveIndicatorTimeout);

    // The icon active state may have changed (visually indicated by its
    // opacity) in the maximised status bar, so we still need this call to
    // refresh the minimised status bar so that it looks like the maximised.
    this.manager.cloneStatusbar();
  };
  exports.GeolocationIcon = GeolocationIcon;
}(window));
