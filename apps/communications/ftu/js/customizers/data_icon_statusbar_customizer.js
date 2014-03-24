/* global Customizer */

'use strict';

var DataIconStatubarCustomizer = (function() {
  Customizer.call(this, 'dataiconstatusbar', 'json');

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

var dataIconStatubarCustomizer = new DataIconStatubarCustomizer();
dataIconStatubarCustomizer.init();
