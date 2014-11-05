/* global Customizer */

'use strict';

var DefaultSearchCustomizer = (function() {
  Customizer.call(this, 'default_search', 'json');

  this.set = function(aData) {
    if (!aData) {
      return;
    }
    var settings = navigator.mozSettings;
    if (!settings) {
      console.error('DefaultSearchCustomizer. Settings is not available');
      return;
    }

    settings.createLock().set({
      'search.urlTemplate': aData.urlTemplate,
      'search.suggestionsUrlTemplate': aData.suggestionsUrlTemplate,
      'search.iconUrl': aData.iconUrl
    });
  };
});

var defaultSearchCustomizer = new DefaultSearchCustomizer();
defaultSearchCustomizer.init();
