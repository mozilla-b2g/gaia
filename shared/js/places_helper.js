/* global asyncStorage */
/* exported PlacesHelper */
'use strict';

(function(exports) {
  const DB_NAME = 'places';
  const DB_VERSION = 3;
  const SITES_STORE = 'sites';
  const PAGES_STORE = 'pages';
  const VISITS_STORE = 'visits';

  function upgradePlacesDb(e) {
    var db = e.target.result;
    var fromVersion = e.oldVersion;

    if (fromVersion < 1) {
      var pages = db.createObjectStore(PAGES_STORE, {
        keyPath: 'url'
      });
      pages.createIndex('frecency', 'frecency', { unique: false });
      pages.createIndex('visited', 'visited', { unique: false });

      var sitesStore = db.createObjectStore(SITES_STORE, {
        keyPath: 'url'
      });
      sitesStore.createIndex('frecency', 'frecency', { unique: false });
    }

    if (fromVersion < 2) {
      if (asyncStorage) {
        asyncStorage.removeItem('latest-revision');
      }
      var visits = db.createObjectStore(VISITS_STORE, {
        keyPath: 'date'
      });
      visits.createIndex('date', 'date', { unique: true });
      visits.createIndex('url', 'url', { unique: false });
    }
  }

  exports.PlacesHelper = {
    DB_NAME: DB_NAME,
    DB_VERSION: DB_VERSION,

    SITES_STORE: SITES_STORE,
    PAGES_STORE: PAGES_STORE,
    VISITS_STORE: VISITS_STORE,

    upgradeDb: upgradePlacesDb
  };
})(window);
