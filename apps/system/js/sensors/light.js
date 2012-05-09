'use strict';

(function() {
  var power = navigator.mozPower;
  if (!power)
    return;

  var Light = {
    _previousBrightness: 0.5,

    settingChanged: function sl_settingChanged(value) {
      value ? this.activate() : this.deactivate();
    },

    activate: function sl_activate() {
      this._previousBrightness = power.screenBrightness;
      window.addEventListener('devicelight', this);
    },
    deactivate: function sl_deactivate() {
      power.screenBrightness = this._previousBrightness;
      window.removeEventListener('devicelight', this);
    },

    handleEvent: function sl_handleEvent(evt) {
      // This is a rather naive but pretty effective heuristic
      var brightness = Math.max(Math.min((evt.value / 1100), 1), 0.2);
      power.screenBrightness = brightness;
    }
  };

  SettingsListener.observe('screen.automatic-brightness',
                           true, Light.settingChanged.bind(Light));
})();
