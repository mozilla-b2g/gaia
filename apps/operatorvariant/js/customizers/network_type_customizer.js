/* global Customizer */

'use strict';

var NetworkTypeCustomizer = (function() {
  Customizer.call(this, 'network_type', 'json');

  this.set = function(aDatas) {
    try {
      if (!aDatas) {
        return;
      }
      var settings = navigator.mozSettings;
      if (!settings) {
        console.error('NetworkTypeCustomizer. Settings is not available');
        return;
      }

      var settingsValue = {};

      for (var key in aDatas) {
        settingsValue[key] = aDatas[key];
      }
      if (Object.keys(settingsValue).length) {
        settings.createLock().set({
          'operatorResources.data.icon': settingsValue
        });
      }

    } catch (e) {
      console.error('NetworkTypeCustomizer. Error recovering datas. ' +
                    'We will use default values. ' + e);
    }
  };
});

var networkTypeCustomizer = new NetworkTypeCustomizer();
networkTypeCustomizer.init();
