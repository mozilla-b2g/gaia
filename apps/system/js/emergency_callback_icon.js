/* global BaseIcon */
'use strict';

(function(exports) {
  var EmergencyCallbackIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  EmergencyCallbackIcon.prototype = Object.create(BaseIcon.prototype);
  EmergencyCallbackIcon.prototype.name = 'EmergencyCallbackIcon';
  EmergencyCallbackIcon.prototype.shouldDisplay = function() {
    return this.manager.active;
  };

  EmergencyCallbackIcon.prototype.view = function view() {
    return `<div id="statusbar-emergency-callback"
              class="sb-icon sb-icon-emergency-callback"
              hidden role="listitem"
              data-l10n-id="statusbarEmergencyCallback">
            </div>`;
  };

  exports.EmergencyCallbackIcon = EmergencyCallbackIcon;
}(window));

