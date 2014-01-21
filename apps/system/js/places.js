/**
 * Places.
 *
 * Places is the browser history, bookmark and icon management system for
 * B2G.
 */

'use strict';

var Places = {

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
      this.setPlaceIconUri(evt.detail.config.url, evt.detail.config.icon.href);
      break;
    }
  },

  addPlace: function(url, callback) {
    var place = {
      url: url,
      title: url,
      frecency: 1
    };
    this.dataStore.add(place, url).then(function(id) {
      if (callback) {
        callback(null, place);
      }
    });
  },

  incrementPlaceFrecency: function(url, callback) {
    this.editPlace(url, function(place, cb) {
      place.frecency++;
      cb(place);
    }, callback);
  },

  editPlace: function(url, fun, callback) {
    var self = this;
    this.getPlace(url, function(err, place) {
      if (err) { return callback(err); }
      fun(place, function(newPlace) {
        self.updatePlace(url, newPlace, callback);
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
  addVisit: function(url, callback) {
    this.getPlace(url, (function(err, place) {
      if (err) {
        return this.addPlace(url, callback);
      }
      this.incrementPlaceFrecency(url, callback);
    }).bind(this));
  },

  /**
   * Clear all the visits in the store
   *
   * @param {Function} callback Function to call with result.
   */
  clear: function(callback) {
    this.dataStore.clear().then(function() {
      if (callback) {
        callback(null);
      }
    });
  },

  /**
   * Get place.
   *
   * @param {String} url URL of place to get.
   * @param {Function} callback Function to call with result.
   */
  getPlace: function(url, callback) {
    this.dataStore.get(url).then(function(place) {
      if (place && callback) {
        callback(null, place);
      } else if (callback) {
        callback('not_found');
      }
    });
  },

  /**
   *  Update place.
   *
   *  @param {String} url URL of place to update.
   *  @param {Object} place New place data.
   *  @param {Function} callback Function to call on success.
   */
  updatePlace: function(url, place, callback) {
    this.dataStore.put(place, url).then(function(id) {
      if (callback) {
        callback(null, place);
      }
    });
  },

  /**
   * Set place title.
   *
   * @param {String} url URL of place to update.
   * @param {String} title Title of place to set.
   * @param {Function} callback Function to call on success.
   */
  setPlaceTitle: function(url, title, callback) {
    this.editPlace(url, function(place, cb) {
      place.title = title;
      cb(place);
    }, callback);
  },

  /**
   * Set place icon.
   *
   * @param {String} url URL of place to update.
   * @param {String} iconUri URL of the icon for url
   * @param {Function} callback Function to call on completion.
   */
  setPlaceIconUri: function(url, iconUri, callback) {
    this.editPlace(url, function(place, cb) {
      place.iconUri = iconUri;
      cb(place);
    }, callback);
  }
};
