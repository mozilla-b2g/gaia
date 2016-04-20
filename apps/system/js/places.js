'use strict';
/* globals Promise, BaseModule, indexedDB */
/* exported Places */

(function() {
  /**
   * The Places database stores pinned sites, pinned pages,
   * browsing history and icons.
   *
   * @requires BaseModule
   * @class Places
   */
  function Places() {}

  /**
   * Services which can be called externally via Service.request()
   */
  Places.SERVICES = [
    'pinSite'
  ];

  BaseModule.create(Places, {
    name: 'Places',

    /**
     * The name of the IndexedDB database.
     */
    DB_NAME: 'places',

    /**
     * Current database version.
     */
    DB_VERSION: 1,

    /**
     * Names of stores for storing sites, pages, visits and icons.
     */
    SITES_STORE: 'sites',
    //PAGES_STORE: 'pages',
    //VISITS_STORE: 'visits',
    //ICONS_STORE: 'icons',

    /**
     * The places database object.
     */
    db: null,

    /**
     * Start places.
     *
     * Add window event listeners and open the database.
     *
     * @memberof Places.prototype
     */
    _start: function() {
      /*window.addEventListener('applocationchange', this);
      window.addEventListener('apptitlechange', this);
      window.addEventListener('appiconchange', this);
      window.addEventListener('appmetachange', this);
      window.addEventListener('apploaded', this);*/
      return this.open();
    },

    /**
     * Open the database.
     *
     * @returns Promise which resolves upon successful database opening.
     */
    open: function() {
      return new Promise((function(resolve, reject) {
        var request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
        request.onsuccess = (function(event) {
          this.db = event.target.result;
          resolve();
        }).bind(this);
        
        request.onerror = function() {
          reject(request.errorCode);
        };
    
        request.onupgradeneeded = this.upgrade.bind(this);
      }).bind(this));
    },

    /**
     * Upgrade database to new version.
     *
     * @param {Event} upgradeneeded event.
     */
    upgrade: function(event) {
      console.log('Upgrading Places database...');
      this.db = event.target.result;
  
      if(this.db.objectStoreNames.contains(this.SITES_STORE)) {
        console.log('Sites store already exists');
        return;
      }
  
      var objectStore = this.db.createObjectStore(this.SITES_STORE,
        { keyPath: 'id' });
      objectStore.createIndex('frecency', 'frecency', { unique: false });
      objectStore.transaction.oncomplete = function() {
        console.log('Sites store created successfully');
      };
  
      objectStore.transaction.onerror = function() {
        console.error('Error creating Sites store');
      };
  
    },

    /**
     * Handle window events.
     * 
     * @param {Event} event The event.
     * @memberof Places.prototype
     */
    /*handleEvent: function(event) {
      var browserWindow = event.detail;

      // Do not store data for private windows.
      if (browserWindow && browserWindow.isPrivateBrowser()) {
        return;
      }

      switch (event.type) {
        case 'applocationchange':
          this.handleLocationChange(browserWindow.config.url);
          break;
        ase 'apptitlechange':
          this.handleTitleChange(browserWindow.config.url, browserWindow.title);
          break;
        case 'appiconchange':
          this.handleIconChange(browserWindow.config.url,
            browserWindow.favicons);
          break;
        case 'appmetachange':
          this.handleMetaChange(browserWindow.config.url, browserWindow.meta);
          break;
        case 'apploaded':
          // TODO: Do something
          break;
      }
    },*/

    /**
     * Create a new page object for a URL.
     * 
     * @param {String} url The URL of a page.
     * @return {Object}
     * @memberof Places.prototype
     */
    /*createPageObject: function(url) {
      return {
        url: url,
        title: url,
        icons: {},
        meta : {},
        frecency: 0,
        themeColor: null
      };
    },*/

    /**
     * Pin a site.
     */
    pinSite: function(id, siteObject) {
      var transaction = this.db.transaction(this.SITES_STORE, 'readwrite');
      var objectStore = transaction.objectStore(this.SITES_STORE);
      var writeRequest = objectStore.put(siteObject);
    
      writeRequest.onsuccess = function() {
        console.log('Successfully pinned site ' + ' with id ' + siteObject.id);
      };

      writeRequest.onerror = function() {
        console.error('Error updating site with id ' + siteObject.id);
      };
    },

    /**
     * Stub function.
     *
     * TODO: Make this work.
     */
    isPinned: function(url) {
      return Promise.resolve(true);
    }
  });
}());
