/* global BaseIcon */
'use strict';

(function(exports) {
  var MuteIcon = function() {};
  MuteIcon.prototype = Object.create(BaseIcon.prototype);
  MuteIcon.prototype.name = 'MuteIcon';
  MuteIcon.prototype.update = function() {
    var icon = this.element;
    if (!icon || !this.enabled()) {
      return;
    }
    this.manager.currentVolume.notification !== 0 ? this.hide() : this.show();

    var vibrate = this.manager.vibrateEnabled;
    if (vibrate) {
      icon.classList.add('vibration');
    } else {
      icon.classList.remove('vibration');
    }
    this.updateLabel(vibrate ? 'vibration' : 'mute');
  };
  exports.MuteIcon = MuteIcon;
}(window));
