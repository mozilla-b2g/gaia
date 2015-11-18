'use strict';
/* globals
  asyncStorage,
  BaseModule,
  LazyLoader,
  placesModel,
  Promise,
  Service
*/

/* exported Places */

(function() {

  const SCREENSHOT_TIMEOUT = 5000;

  /**
   * Places is the browser history, bookmark and icon management system for
   * B2G. Places monitors app events and syncs information with the Places
   * datastore for consumption by apps like Search.
   * @requires BaseModule
   * @class Places
   */
  function Places() {}
  Places.SUB_MODULES = [
    'BrowserSettings'
  ];
  Places.SERVICES = [
    'clearHistory'
  ];

  BaseModule.create(Places, {
    name: 'Places',

    /**
     * A queue of screenshot URLs that we are loading.
     * @memberof Places.prototype
     * @type {Array}
     */
    screenshotQueue: {},

    /**
     * Maximum number of top sites we display
     * @memberof Places.prototype
     * @type {Integer}
     */
    MAX_TOP_SITES: 6,

    topSites: [],

    /**
     * Starts places.
     * Adds necessary event listeners and gets the datastore.
     * @param {Function} callback
     * @memberof Places.prototype
     */
    _start: function() {
      return new Promise(resolve => {
        window.addEventListener('applocationchange', this);
        window.addEventListener('apptitlechange', this);
        window.addEventListener('appiconchange', this);
        window.addEventListener('apploaded', this);

        asyncStorage.getItem('top-sites', results => {
          this.topSites = results || [];
          resolve();
        });
      });
    },

    /**
     * General event handler interface.
     * @param {Event} evt The event.
     * @memberof Places.prototype
     */
    handleEvent: function(evt) {
      var app = evt.detail;

      // If the app is not a browser, do not track places as tracking places
      // currently has a non-trivial startup cost.
      if (app && !app.isBrowser()) {
        return;
      }

      // Do not persist information for private browsers.
      if (app && app.isPrivateBrowser()) {
        return;
      }

      switch (evt.type) {
        case 'applocationchange':
          this.onLocationChange(app.config.url);
          break;
        case 'apptitlechange':
          this.onTitleChange(app.config.url, app.title);
          break;
        case 'appiconchange':
          this.onIconChange(app.config.url, app.favicons);
          break;
        case 'apploaded':
          if (app.config.url in this.screenshotQueue) {
            this.takeScreenshot(app.config.url);
          }
          this.debouncePlaceChanges(app.config.url);
          break;
      }
    },

    /**
     * Requests a screenshot of a URL.
     * @param {String} url The URL of a page.
     * @memberof Places.prototype
     */
    screenshotRequested: function(url) {
      var app = Service.query('getAppByURL', url);
      if (!app || app.loading) {
        this.screenshotQueue[url] = setTimeout(() => {
          this.takeScreenshot(url);
        }, SCREENSHOT_TIMEOUT);
      } else {
        this.takeScreenshot(url);
      }
    },

    takeScreenshot: function(url) {
      if (url in this.screenshotQueue) {
        clearTimeout(this.screenshotQueue[url]);
        delete this.screenshotQueue[url];
      }

      var app = Service.query('getAppByURL', url);
      if (!app) {
        console.error('Couldnt find app for:', url);
        return false;
      }

      app.getBottomMostWindow().getScreenshot(screenshot => {
        if (screenshot) {
          this.saveScreenshot(url, screenshot);
        }
      }, null, null, null, true);
    },

    /**
     * Check if we need to render a screenshot of the current visit
     * in the case that it is in the top most visited sites
     */
    checkTopSites: function(place) {
      var numTopSites = this.topSites.length;
      var lastTopSite = this.topSites[numTopSites - 1];
      if (numTopSites < this.MAX_TOP_SITES ||
        place.frecency > lastTopSite.frecency) {
        this.topSites.push(place);
        this.screenshotRequested(place.url);
        this.topSites.sort(function(a, b) {
          return b.frecency - a.frecency;
        });
        if (this.topSites.length > this.MAX_TOP_SITES) {
          this.topSites.length = this.MAX_TOP_SITES;
        }
        asyncStorage.setItem('top-sites', this.topSites);
      }
    },

    /**
     * Clear all the visits in the store but the pinned pages.
     *
     * @return Promise
     */
    clearHistory: function() {
      return LazyLoader.load(['/shared/js/places_model.js']).then(() => {
        return placesModel.clearHistory();
      });
    },

    /**
     * Add visit.
     *
     * Updates our place cache. Currently this just increments frecency, but
     * eventually there should be a separate 'visits' DataStore to store a
     * record for every visit in order to render a history view.
     *
     * @param {String} url URL of visit to record.
     * @memberof Places.prototype
     */
    onLocationChange: function(url) {
      return LazyLoader.load(['/shared/js/places_model.js']).then(() => {
        return placesModel.addVisit(url);
      });
    },

    /**
     * Set place title.
     *
     * @param {String} url URL of place to update.
     * @param {String} title Title of place to set.
     * @memberof Places.prototype
     */
    onTitleChange: function(url, title) {
      return LazyLoader.load(['/shared/js/places_model.js']).then(() => {
        return placesModel.setTitle(url, title);
      });
    },

    /**
     * Set place icon.
     *
     * @param {String} url URL of place to update.
     * @param {String} icon The icon object
     * @memberof Places.prototype
     */
    onIconChange: function(url, icons) {
      return LazyLoader.load(['/shared/js/places_model.js']).then(() => {
        return placesModel.setIcon(url, icons);
      });
    }
  });
}());
