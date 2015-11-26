/* global Customizer, LazyLoader, placesModel */

'use strict';

var TopSitesCustomizer = (function() {
  Customizer.call(this, 'topsites', 'json');

  this.set = function(topSiteConfig) {
    LazyLoader.load(['shared/js/places_model.js']).then(() => {
      return placesModel.setTopSites(topSiteConfig);
    });
  };

});

var topSitesCustomizer = new TopSitesCustomizer();
topSitesCustomizer.init();
