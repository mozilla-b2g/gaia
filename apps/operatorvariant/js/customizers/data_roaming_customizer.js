/* global Customizer */

'use strict';

var DataRoamingCustomizer = (function() {
  Customizer.call(this, 'data_roaming', 'data');
  this.set = function(isEnabled) {
    if (typeof isEnabled !== 'boolean') {
      console.error('DataRoamingCustomizer. Invalid type for input value.');
      return;
    }

    if (!this.simPresentOnFirstBoot) {
      console.log('DataRoamingCustomizer. No first RUN with configured SIM.');
      return;
    }

    var settings = navigator.mozSettings;
    if (!settings) {
      console.error('DataRoamingCustomizer. Settings is not available');
      return;
    }

    settings.createLock().set({
      'ril.data.roaming_enabled': isEnabled
    });
  };
});

var dataRoamingCustomizer = new DataRoamingCustomizer();
dataRoamingCustomizer.init();
