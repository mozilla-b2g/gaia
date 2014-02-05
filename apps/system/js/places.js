/* globals SettingsListener, Promise */
/* exported Places */

/**
 * Places.
 *
 * Places is the browser history, bookmark and icon management system for
 * B2G.
 */

'use strict';

var Places = {

  MAX_URL_ICONS: 5,

  STORE_NAME: 'places',

  dataStore: null,

  rocketBarEnabled: false,

  init: function(callback) {
    window.addEventListener('apptitlechange', this);
    window.addEventListener('applocationchange', this);
    window.addEventListener('appiconchange', this);

    navigator.getDataStores(this.STORE_NAME)
      .then(this.initStore.bind(this)).then(callback);

    SettingsListener.observe('rocketbar.enabled', false, (function(value) {
      this.rocketBarEnabled = value;
    }).bind(this));
  },

  initStore: function(stores) {
    if (stores.length > 1) {
      console.log('Multiple places DataStores available, using the first.');
    }
    this.dataStore = stores[0];
    return new Promise(function(resolve) { resolve(); });
  },

  handleEvent: function(evt) {
    if (!this.rocketBarEnabled) {
      return;
    }

    switch (evt.type) {
    case 'apptitlechange':
      this.setPlaceTitle(evt.detail.config.url, evt.detail.title);
      break;
    case 'applocationchange':
      this.addVisit(evt.detail.config.url);
      break;
    case 'appiconchange':
      this.setPlaceIcon(evt.detail.config.url,
                           evt.detail.config.favicon);
      break;
    }
  },

  defaultPlace: function(url) {
    return {
      url: url,
      title: url,
      icons: [],
      frecency: 1
    };
  },

  editPlace: function(url, fun) {
    var self = this;
    var rev = this.dataStore.revisionId;
    return new Promise(function(resolve) {
      self.dataStore.get(url).then(function(place) {
        fun(place, function(newPlace) {
          if (self.dataStore.revisionId !== rev) {
            return self.editPlace(url, fun);
          }
          self.dataStore.put(newPlace, url, rev).then(resolve);
        });
      });
    });
  },

  /**
   * Add visit.
   *
   * Record visit to place. Currently this just increments frecency, but
   * eventually there should be a separate 'visits' DataStore to store a
   * record for every visit in order to render a history view.
   *
   * @param {String} url URL of visit to record.
   */
  addVisit: function(url) {
    return this.editPlace(url, (function(place, cb) {
      if (!place) {
        cb(this.defaultPlace(url));
      } else {
        place.frecency++;
        cb(place);
      }
    }).bind(this));
  },

  /**
   * Clear all the visits in the store
   *
   */
  clear: function() {
    return this.dataStore.clear();
  },

  /**
   * Set place title.
   *
   * @param {String} url URL of place to update.
   * @param {String} title Title of place to set.
   */
  setPlaceTitle: function(url, title) {
    return this.editPlace(url, (function(place, cb) {
      if (!place) {
        place = this.defaultPlace(url);
      }
      place.title = title;
      cb(place);
    }).bind(this));
  },

  /**
   * Set place icon.
   *
   * @param {String} url URL of place to update.
   * @param {Object} icon icon object
   */
  setPlaceIcon: function(url, icon) {
    return this.editPlace(url, (function(place, cb) {
      if (!place) {
        place = this.defaultPlace(url);
      }

      var sizes = [];
      if (icon.sizes && icon.sizes !== '') {
        // The `sizes` property contains a string like '32x32 48x48',
        // we store it as an array of integers.
        sizes = icon.sizes.split(/\s/).map(function(size) {
          return parseInt(size.substring(0, size.indexOf('x')), 10);
        });
      }

      var newIcon = {
        url: icon.href,
        sizes: sizes
      };

      function iconExists(url) {
        for (var i = 0; i < place.icons.length; i++) {
          if (place.icons[i].url === url) {
            return true;
          }
        }
        return false;
      }

      if (!iconExists(newIcon.url) &&
        place.icons.length < this.MAX_URL_ICONS) {
        place.icons.push(newIcon);
      }
      cb(place);
    }).bind(this));
  }
};
