/* global Customizer */

'use strict';

var TopSitesCustomizer = (function() {
  Customizer.call(this, 'topsites', 'json');

  this.set = function(aDatas) {
    try {
      if (!aDatas) {
        return;
      }
      var settings = navigator.mozSettings;
      if (!settings) {
        console.error('TopSitesCustomizer. Settings is not available');
        return;
      }

      var settingsValue = {};

      for (var key in aDatas) {
        settingsValue[key] = aDatas[key];
      }

      if (Object.keys(settingsValue).length) {
        settings.createLock().set({
          'operatorResources.data.topsites': settingsValue
        });
      }

    } catch (e) {
      console.error('TopSitesCustomizer. Error recovering datas. ' +
                    'We will use default values. ' + e);
    }
  };
});

var topSitesCustomizer = new TopSitesCustomizer();
topSitesCustomizer.init();
