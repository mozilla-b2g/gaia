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

    function createTopSite(store, site) {
      var revId = store.revisionId;
      return store.get(site.url).then(place => {
        if (!place) {
          site.frecency = -1;
          return store.put(site, site.url, revId).catch(err => {
            if (err.message && err.message === 'RevisionId is not up-to-date') {
              console.warn('Versioning conflict, retrying...', site.url);
              return createTopSite(store, site);
            } else {
              throw err;
            }
          });
        }
        return Promise.resolve();
      });
    }

    this.getStore('places').then(store => {
      topSiteConfig.topSites.forEach(site => {
        createTopSite(store, site);
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
