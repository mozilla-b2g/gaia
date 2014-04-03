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

  STORE_NAME: 'places',

  dataStore: null,

  rocketBarEnabled: false,

  writeInProgress: false,

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
      this.setPlaceIconUri(evt.detail.config.url,
                           evt.detail.config.favicon.href);
      break;
    }
  },

  defaultPlace: function(url) {
    return {
      url: url,
      title: url,
      frecency: 0
    };
  },

  editPlace: function(url, fun) {
    var self = this;
    var rev = this.dataStore.revisionId;
    return new Promise(function(resolve) {
      self.dataStore.get(url).then(function(place) {
        place = place || self.defaultPlace(url);
        fun(place, function(newPlace) {
          if (self.writeInProgress || self.dataStore.revisionId !== rev) {
            return self.editPlace(url, fun);
          }
          self.writeInProgress = true;
          self.dataStore.put(newPlace, url).then(function() {
            self.writeInProgress = false;
            resolve();
          });
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
    return this.editPlace(url, function(place, cb) {
      place.frecency++;
      cb(place);
    });
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
    return this.editPlace(url, function(place, cb) {
      place.title = title;
      cb(place);
    });
  },

  /**
   * Set place icon.
   *
   * @param {String} url URL of place to update.
   * @param {String} iconUri URL of the icon for url
   */
  setPlaceIconUri: function(url, iconUri) {
    return this.editPlace(url, function(place, cb) {
      place.iconUri = iconUri;
      cb(place);
    });
  }
};
