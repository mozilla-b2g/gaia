/* global BaseIcon */
'use strict';

(function(exports) {
  var TetheringIcon = function(manager) {
    BaseIcon.call(this, manager);
  };
  TetheringIcon.prototype = Object.create(BaseIcon.prototype);
  TetheringIcon.prototype.name = 'TetheringIcon';
  TetheringIcon.prototype.update = function() {
    var icon = this.element;
    if (!this.element || !this.enabled()) {
      return;
    }
    this.manager.enabled ? this.show() : this.hide();

    icon.dataset.active = !!this.manager.connected;

    this.updateLabel('tethering', !!this.manager.connected);
  };
  exports.TetheringIcon = TetheringIcon;
}(window));
