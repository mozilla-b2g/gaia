/* global System, BaseUI */
'use strict';

(function(exports) {
  var AirplaneModeIcon = function(manager) {
    this.manager = manager;
  };
  AirplaneModeIcon.prototype = Object.create(BaseUI.prototype);
  AirplaneModeIcon.prototype.constructor = AirplaneModeIcon;
  AirplaneModeIcon.prototype.EVENT_PREFIX = 'airplanemodeicon';
  AirplaneModeIcon.prototype.containerElement = document.getElementById('statusbar');
  AirplaneModeIcon.prototype.view = function() {
    return '<div id="' + this.instanceID + '" class="sb-icon sb-icon-flight-mode" ' +
            'hidden role="listitem" data-l10n-id="statusbarFlightMode"></div>';
  };
  AirplaneModeIcon.prototype.instanceID = 'statusbar-flight-mode';
  AirplaneModeIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  AirplaneModeIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  AirplaneModeIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  AirplaneModeIcon.prototype.start = function() {
    window.addEventListener('airplanemode-enabled', this);
    window.addEventListener('airplanemode-disabled', this);
    this.update();
  };
  AirplaneModeIcon.prototype.stop = function() {
    window.removeEventListener('airplanemode-enabled', this);
    window.removeEventListener('airplanemode-disabled', this);
  };
  AirplaneModeIcon.prototype.handleEvent = function() {
    this.update();
  };
  AirplaneModeIcon.prototype.setActive = function(active) {
    this.update();
  };
  AirplaneModeIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  AirplaneModeIcon.prototype.update = function() {
    var flightModeIcon = this.element;
    var status = System.query('AirplaneMode.enabled');

    if (status === 'enabled') {
      flightModeIcon.hidden = false;
    } else if (status === 'disabled') {
      flightModeIcon.hidden = true;
    }

    this.manager._updateIconVisibility();
  };
}(window));
