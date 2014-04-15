/* globals SettingsListener, Promise, AppWindowManager */
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

  screenshotQueue: [],

  init: function(callback) {
    window.addEventListener('apptitlechange', this);
    window.addEventListener('applocationchange', this);
    window.addEventListener('appiconchange', this);
    window.addEventListener('apploaded', this);

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
    var app = evt.detail;
    switch (evt.type) {
    case 'apptitlechange':
      this.setPlaceTitle(app.config.url, app.title);
      break;
    case 'applocationchange':
      this.addVisit(app.config.url);
      break;
    case 'appiconchange':
      this.setPlaceIconUri(app.config.url, app.config.favicon.href);
      break;
    case 'apploaded':
      var index = this.screenshotQueue.indexOf(app.config.url);
      if (index !== -1) {
        this.screenshotRequested(app.config.url);
        this.screenshotQueue.splice(index, 1);
      }
      break;
    }
  },

  screenshotRequested: function(url) {
    var self = this;
    var app = AppWindowManager.getApp(url);
    if (!app) {
      return false;
    }
    if (app.loading) {
      this.screenshotQueue.push(url);
      return;
    }
    app.getScreenshot(function(screenshot) {
      if (screenshot) {
        self.saveScreenshot(url, screenshot);
      }
    });
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
      place.visited = Date.now();
      place.frecency++;
      cb(place);
    });
  },

  saveScreenshot: function(url, screenshot) {
    return this.editPlace(url, function(place, cb) {
      place.screenshot = screenshot;
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
