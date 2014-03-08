/* global Customizer */

'use strict';

var NetworkTypeCustomizer = (function() {
  Customizer.call(this, 'network_type', 'json');

  this.set = function(aDatas) {
    try {
      if (!aDatas) {
        return;
      }
      var settingsValue = {};

      for (var key in aDatas) {
        settingsValue[key] = aDatas[key];
      }
      if (Object.keys(settingsValue).length) {
        navigator.mozSettings.createLock().set({
          'operatorResources.data.icon': settingsValue
        });
      }

    } catch (e) {
      console.log('Error recovering datas. We will use default values. ' + e);
    }
  };
});

var networkTypeCustomizer = new NetworkTypeCustomizer();
networkTypeCustomizer.init();
