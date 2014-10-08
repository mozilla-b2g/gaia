/* global Customizer */

'use strict';

var TopSitesCustomizer = (function() {
  Customizer.call(this, 'topsites', 'json');

  this.set = function(topSiteConfig) {

    if (!topSiteConfig ||
        !topSiteConfig.topSites ||
        !topSiteConfig.topSites.length) {
      return;
    }

    this.getStore('places').then(store => {
      topSiteConfig.topSites.forEach(site => {
        store.get(site.url).then(place => {
          if (!place) {
            site.frecency = -1;
            store.put(site, site.url);
          }
        });
      });
    });
  };

  this.getStore = function(name) {
    return new Promise(resolve => {
      navigator.getDataStores(name).then(stores => {
        resolve(stores[0]);
      });
    });
  };

});

var topSitesCustomizer = new TopSitesCustomizer();
topSitesCustomizer.init();
