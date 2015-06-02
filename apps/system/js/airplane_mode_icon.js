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

  AirplaneModeIcon.prototype.view = function view() {
    return `<div id="statusbar-airplane-mode"
              class="sb-icon sb-icon-airplane-mode" hidden
              role="listitem"
              data-l10n-id="statusbarAirplaneMode">
            </div>`;
  };

  exports.AirplaneModeIcon = AirplaneModeIcon;
}(window));
