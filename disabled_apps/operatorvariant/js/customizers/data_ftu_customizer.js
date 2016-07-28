/* global Customizer */

'use strict';

var DataFTUCustomizer = (function() {
  Customizer.call(this, 'data_ftu', 'data');
  this.set = function(aIsEnabled) {
    try {
      navigator.mozSettings.createLock().set({
        'ftu.ril.data.enabled': aIsEnabled
      });
    } catch (e) {
      console.log('DataFTUCustomizer. Error recovering datas. ' +
                  'We will use default values. ' + e);
    }
  };
});

var dataFTUCustomizer = new DataFTUCustomizer();
dataFTUCustomizer.init();
