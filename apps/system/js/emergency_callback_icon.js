/* global System, BaseUI */
'use strict';

(function(exports) {
  var EmergencyCallbackIcon = function(manager) {
    this.manager = manager;
  };
  EmergencyCallbackIcon.prototype = Object.create(BaseUI.prototype);
  EmergencyCallbackIcon.prototype.constructor = EmergencyCallbackIcon;
  EmergencyCallbackIcon.prototype.EVENT_PREFIX = 'EmergencyCallbackIcon';
  EmergencyCallbackIcon.prototype.containerElement = document.getElementById('statusbar');
  EmergencyCallbackIcon.prototype.view = function() {
    return '<div id="' + this.instanceID + '" class="sb-icon ' +
            'sb-icon-emergency-cb-notification" hidden role="listitem" ' +
            'data-l10n-id="statusbarEmergencyCBNotification"></div>';
  };
  EmergencyCallbackIcon.prototype.instanceID = 'statusbar-emergency-cb-notification';
  EmergencyCallbackIcon.prototype._fetchElements = function() {
    this.element = document.getElementById(this.instanceID);
  };
  EmergencyCallbackIcon.prototype.show = function() {
    var hidden = this.element.hidden;
    if (!hidden) {
      return;
    }
    this.element.hidden = false;
    this.publish('shown');
  };
  EmergencyCallbackIcon.prototype.hide = function() {
    var hidden = this.element.hidden;
    if (hidden) {
      return;
    }
    this.element.hidden = true;
    this.publish('hidden');
  };
  EmergencyCallbackIcon.prototype.start = function() {
    window.addEventListener('emergencycallbackstatechanged', this);
  };
  EmergencyCallbackIcon.prototype.stop = function() {
    window.removeEventListener('emergencycallbackstatechanged', this);
  };
  EmergencyCallbackIcon.prototype.isVisible = function() {
    return this.element && !this.element.hidden;
  };
  EmergencyCallbackIcon.prototype.handleEvent = function(evt) {
    this.update(evt.detail);
  };
  EmergencyCallbackIcon.prototype.update = function() {
    var icon = this.element
    this.hasEmergencyCallback ? this.show() : this.hide();
    this.manager._updateIconVisibility();
  };
  exports.EmergencyCallbackIcon = EmergencyCallbackIcon;
}(window));
