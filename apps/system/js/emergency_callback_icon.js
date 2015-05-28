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
  exports.EmergencyCallbackIcon = EmergencyCallbackIcon;
}(window));

