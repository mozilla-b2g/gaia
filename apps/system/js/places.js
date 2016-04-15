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

    /**
     * The places database object.
     */
    db: null,

    /**
     * Start places.
     *
     * @memberof Places.prototype
     */
    _start: function() {
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
      objectStore.createIndex('pinned', 'pinned', { unique: false });
      objectStore.transaction.oncomplete = function() {
        console.log('Sites store created successfully');
      };
  
      objectStore.transaction.onerror = function() {
        console.error('Error creating Sites store');
      };
  
    },

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
