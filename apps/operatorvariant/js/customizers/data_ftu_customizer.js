/* global Customizer */

'use strict';

var DataFTUCustomizer = (function() {
  Customizer.call(this, 'data_ftu', 'data');

  this.set = function(aIsEnabled) {
    navigator.mozSettings.createLock().set({
      'ftu.ril.data.enabled': aIsEnabled
    });
  };
});

var dataFTUCustomizer = new DataFTUCustomizer();
dataFTUCustomizer.init();
