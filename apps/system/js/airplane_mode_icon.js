/* global System, BaseUI */
'use strict';

(function(exports) {
  var AirplaneModeIcon = function() {};
  AirplaneModeIcon.prototype = Object.create(BaseIcon.prototype);
  AirplaneModeIcon.prototype.name = 'AirplaneModeIcon';
  AirplaneModeIcon.prototype.determince = function() {
    return this.manager.enabled;
  };
  exports.AirplaneModeIcon = AirplaneModeIcon;
}(window));
