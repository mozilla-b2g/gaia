/* global Customizer */

'use strict';

var SearchCustomizer = (function() {
  Customizer.call(this, 'search', 'json');

  this.set = function(aData) {
    if (!aData) {
      return;
    }
    var settings = navigator.mozSettings;
    if (!settings) {
      console.error('SearchCustomizer. Settings is not available');
      return;
    }

    settings.createLock().set({
      'search.providers': aData
    });
  };
});

var searchCustomizer = new SearchCustomizer();
searchCustomizer.init();
