'use strict';
/* globals SettingsListener, Promise, AppWindowManager */
/* exported Places */

(function(exports) {

  /**
   * Places is the browser history, bookmark and icon management system for
   * B2G. Places monitors app events and syncs information with the Places
   * datastore for consumption by apps like Search.
   * @requires AppWindowManager
   * @requires SettingsListener
   * @class Places
   */
  function Places() {}

  Places.prototype = {

    /**
     * The places store name.
     * @memberof Places.prototype
     * @type {String}
     */
    STORE_NAME: 'places',

    /**
     * A reference to the places datastore.
     * @memberof Places.prototype
     * @type {Object}
     */
    dataStore: null,

    /**
     * Whether or not rocketbar is enabled.
     * @memberof Places.prototype
     * @type {Boolean}
     */
    rocketBarEnabled: false,

    /**
     * Set when we are editing a place record in the datastore.
     * @memberof Places.prototype
     * @type {Boolean}
     */
    writeInProgress: false,

    /**
     * A queue of screenshot URLs that we are loading.
     * @memberof Places.prototype
     * @type {Array}
     */
    screenshotQueue: [],

    /**
     * Starts places.
     * Adds necessary event listeners and gets the datastore.
     * @param {Function} callback
     * @memberof Places.prototype
     */
    start: function(callback) {
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

    /**
     * Initializes the datastore after calling navigator.getDataStores.
     * @param {Array} stores A list of places datastores.
     * @memberof Places.prototype
     */
    initStore: function(stores) {
      this.dataStore = stores[0];
      return new Promise(function(resolve) { resolve(); });
    },

    /**
     * General event handler interface.
     * @param {Event} evt The event.
     * @memberof Places.prototype
     */
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

    /**
     * Requests a screenshot of a URL.
     * @param {String} url The URL of a page.
     * @memberof Places.prototype
     */
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

    /**
     * Formats a URL as a place object.
     * @param {String} url The URL of a place.
     * @return {Object}
     * @memberof Places.prototype
     */
    defaultPlace: function(url) {
      return {
        url: url,
        title: url,
        frecency: 0
      };
    },

    /**
     * Helper function to edit a place record in the datastore.
     * @param {String} url The URL of a place.
     * @param {Function} fun Handles place updates.
     * @memberof Places.prototype
     */
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
     * @memberof Places.prototype
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
     * Clear all the visits in the store.
     * @memberof Places.prototype
     */
    clear: function() {
      return this.dataStore.clear();
    },

    /**
     * Set place title.
     *
     * @param {String} url URL of place to update.
     * @param {String} title Title of place to set.
     * @memberof Places.prototype
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
     * @param {String} iconUri URL of the icon for url.
     * @memberof Places.prototype
     */
    setPlaceIconUri: function(url, iconUri) {
      return this.editPlace(url, function(place, cb) {
        place.iconUri = iconUri;
        cb(place);
      });
    }
  };

  exports.Places = Places;

}(window));
