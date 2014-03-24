/* global Customizer */

'use strict';

var PowerCustomizer = (function() {
  Customizer.call(this, 'power', 'json');

  this.set = function(aDatas) {
    if (!aDatas) {
      return;
    }
    var settingsValue = {};

    if (aDatas.poweron) {
      if (aDatas.poweron.video) {
        settingsValue['poweron.video'] = aDatas.poweron.video;
      }
      if (aDatas.poweron.image) {
        settingsValue['poweron.image'] = aDatas.poweron.image;
      }
    }
    if (aDatas.poweroff) {
      if (aDatas.poweroff.video) {
        settingsValue['poweroff.video'] = aDatas.poweroff.video;
      }
      if (aDatas.poweroff.image) {
        settingsValue['poweroff.image'] = aDatas.poweroff.image;
      }
    }

    if (Object.keys(settingsValue).length) {
      navigator.mozSettings.createLock().set({
        'operatorResources.power': settingsValue
      });
    }
  };
});

var powerCustomizer = new PowerCustomizer();
powerCustomizer.init();
