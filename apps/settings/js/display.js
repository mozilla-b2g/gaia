var Display = {
  init: function() {
    var panel = document.getElementById('display');
    var settings = Settings.mozSettings;
    if (!settings || !panel)
      return;

    var manualBrightness = panel.querySelector('#brightness-manual');
    var autoBrightness = panel.querySelector('#brightness-auto');
    var autoBrightnessSetting = 'screen.automatic-brightness';

    // hide "Adjust automatically" if there's no ambient light sensor --
    // until bug 876496 is fixed, we have to read the `sensors.json' file to
    // be sure this ambient light sensor is enabled.
    loadJSON('/resources/sensors.json', function loadSensors(activeSensors) {
      if (activeSensors.ambientLight) { // I can haz ambient light sensor
        autoBrightness.hidden = false;
        settings.addObserver(autoBrightnessSetting, function(event) {
          manualBrightness.hidden = event.settingValue;
        });
        var req = settings.createLock().get(autoBrightnessSetting);
        req.onsuccess = function brightness_onsuccess() {
          manualBrightness.hidden = req.result[autoBrightnessSetting];
        };
      } else { // no ambient light sensor: force manual brightness setting
        autoBrightness.hidden = true;
        manualBrightness.hidden = false;
        var cset = {};
        cset[autoBrightnessSetting] = false;
        settings.createLock().set(cset);
      }
    });

    // LGE_only_S_hyuna.cho@lge.com : add brightness level request by HW
    settings.addObserver('screen.brightness', function(event) {
        Display.updateBrightnessLevel(event.settingValue);
    });

    this.updateBrightnessLevel();
    // LGE_only_E_hyuna.cho@lge.com : add brightness level request by HW

  },

  updateBrightnessLevel: function settings_updateBrightnessLevel(value) {
  var brightnessValue = document.querySelector('#brightness-manual-level');
    var _ = navigator.mozL10n.get;
    if (value == undefined) {
        var settings = navigator.mozSettings;
        var req = settings.createLock().get('screen.brightness');
        req.onsuccess = function brightness_onsuccess() {
            var value = req.result['screen.brightness'];
            var text = _('brightness-level-percent', { level: value * 100 });
            brightnessValue.textContent = text;
        };
    }
    else {
        var text = _('brightness-level-percent', { level: value * 100 });
        brightnessValue.textContent = text;
    }
  }

};
Display.init();
