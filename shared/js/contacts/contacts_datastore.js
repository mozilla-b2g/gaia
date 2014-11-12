'use strict';

/* exported ContactsDatastore */

/**
 *  This object will be useful for contact providers. It provides convenient
 *  access to a contacts datastore
 *
 */

var ContactsDatastore = (function() {
  function ContactsDatastore(provider) {
    this.provider = provider;

    this._datastoreLoaded = false;
    this._datastoreLoading = false;
  }

  function promiseResolution (resolve, reject) {
    /*jshint validthis:true */
    this._datastoreLoading = false;
    this._datastoreLoaded = (this.datastore !== null);

    if (!this.datastore) {
      reject({
        name: 'DatastoreNotFound'
      });
    }
    else {
      resolve(this.datastore);
    }
  }

  ContactsDatastore.prototype = {
    _DS_LOADED_EVENT: 'datastore_loaded',
    _DS_NAME: 'contacts',

    getStore: function() {
      var self = this;

      return new Promise(function(resolve, reject) {
        if (!navigator.getDataStores) {
          reject({
            name: 'DatastoreNotEnabled'
          });
          return;
        }

        if (self._datastoreLoaded) {
          resolve(self.datastore);
          return;
        }

        if (self._datastoreLoading) {
          document.addEventListener(self._DS_LOADED_EVENT, function loaded() {
            document.removeEventListener(self._DS_LOADED_EVENT, loaded);
            promiseResolution.bind(self)(resolve, reject);
          });
          return;
        }

        self._datastoreLoading = true;
        navigator.getDataStores(self._DS_NAME).then(function(stores) {
          var targetOwner = self.provider;

          for (var j = 0; j < stores.length; j++) {
            if (stores[j].owner === targetOwner) {
              self.datastore = stores[j];
              break;
            }
          }

          document.dispatchEvent(new CustomEvent(self._DS_LOADED_EVENT));
          promiseResolution.bind(self)(resolve, reject);

        }, reject);
      });
    }
  };

  return  ContactsDatastore;

}());
