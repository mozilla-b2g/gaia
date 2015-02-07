'use strict';

/* exported SearchProvider */
/* globals LazyLoader */
/* globals SettingsListener */

(function(exports) {

  // When the "search_providers.json" file is edited, this version
  // should be bumped so that existing clients reload the updated
  // data
  var VERSION = 1;

  // Cache for current provider configuration
  var SEARCH_CACHE_KEY = 'search.cache';
  // The users current provider selection
  var SEARCH_PROVIDER_KEY = 'search.provider';

  // File containing the provider configurations for all partners
  var DEFAULT_PROVIDERS_URL = '/shared/js/search_providers.json';

  // Store the users current provider selection
  var provider = null;
  // Store the list of available providers
  var providers = {};

  // Notify a client when provider configuration changes
  var updatedFun;

  // Allow consumers to wait for data to be initialised
  var readyPromise;

  // TODO: This should implement how we pick the partner from
  // the details of the users build
  function getPartnerCode(cb) {
    cb('default');
  }

  // We havent got valid cached data so load the json configuration
  // file and pick the configuration based on the current
  // partner code
  function loadProviderConfig() {
    getPartnerCode(function(code) {
      LazyLoader.getJSON(DEFAULT_PROVIDERS_URL).then(result => {

        // Fallback to default if partner code is not defined
        code = (code in result) ? code : 'default';
        providers = result[code];

        // Cache for future lookups
        var cache = {};
        cache[SEARCH_CACHE_KEY] = {};
        cache[SEARCH_CACHE_KEY].providers = providers;
        cache[SEARCH_CACHE_KEY].version = VERSION;
        navigator.mozSettings.createLock().set(cache);

        providersLoaded();
      });
    });
  }

  // Once the providers are loaded, find the users current provider
  // selection
  function providersLoaded() {
    SettingsListener.observe(SEARCH_PROVIDER_KEY, false, value => {
      // 'value' should only be false on 'install-gaia' upgrades, but
      // in that case just pick first provider
      if (value === false || !(value in providers)) {
        provider = Object.keys(providers)[0];
      } else {
        provider = value;
      }

      if (readyPromise && isReady()) {
        readyPromise();
        readyPromise = null;
      }

      if (updatedFun) {
        updatedFun();
      }
    });
  }

  function isReady() {
    return provider !== null && Object.keys(providers).length;
  }

  // Attempt to load cached provider configuration
  var req = navigator.mozSettings.createLock().get(SEARCH_CACHE_KEY);
  req.onsuccess = function() {
    // Do a version check so if the data has updated since it
    // was cached, reload it
    if (SEARCH_CACHE_KEY in req.result &&
        req.result[SEARCH_CACHE_KEY].version === VERSION) {
      providers = req.result[SEARCH_CACHE_KEY].providers;
      providersLoaded();
    } else {
      // There was no cache or it failed the version check, reload
      // from file
      loadProviderConfig();
    }
  };

  var SearchProvider = function(key) {
    if (!provider || !(key in providers[provider])) {
      return false;
    }
    return providers[provider][key];
  };

  SearchProvider.providerUpdated = function(cb) {
    updatedFun = cb;
  };

  SearchProvider.setProvider = function(value) {
    if (!(value in providers)) {
      return false;
    }
    var setting = {};
    setting[SEARCH_PROVIDER_KEY] = value;
    navigator.mozSettings.createLock().set(setting);
  };

  SearchProvider.selected = function() {
    return provider;
  };

  SearchProvider.providers = function() {
    return providers;
  };

  SearchProvider.ready = function() {
    if (isReady()) {
      return Promise.resolve();
    }
    return new Promise(resolve => {
      readyPromise = resolve;
    });
  };

  exports.SearchProvider = SearchProvider;

})(window);
