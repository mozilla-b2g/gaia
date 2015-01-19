/* global BaseIcon */
'use strict';

(function(exports) {
  var AirplaneModeIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  AirplaneModeIcon.prototype = Object.create(BaseIcon.prototype);
  AirplaneModeIcon.prototype.name = 'AirplaneModeIcon';
  AirplaneModeIcon.prototype.shouldDisplay = function() {
    return this.manager.enabled;
  };
  exports.AirplaneModeIcon = AirplaneModeIcon;
}(window));
