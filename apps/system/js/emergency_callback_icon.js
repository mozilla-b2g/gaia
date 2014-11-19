/* global System, BaseUI */
'use strict';

(function(exports) {
  var EmergencyCallbackIcon = function() {};
  EmergencyCallbackIcon.prototype = Object.create(BaseIcon.prototype);
  EmergencyCallbackIcon.prototype.name = 'EmergencyCallbackIcon';
  EmergencyCallbackIcon.prototype.determine = function() {
    return this.manager.active;
  };
  exports.EmergencyCallbackIcon = EmergencyCallbackIcon;
}(window));

