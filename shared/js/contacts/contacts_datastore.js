'use strict';

/* exported ContactsDatastore */

/**
 *  This object will be useful for contact providers. It provides convenient
 *  access to a contacts datastore
 *
 */

function ContactsDatastore(provider) {
  this.provider = provider;

  this._datastoreLoaded = false;
  this._datastoreLoading = false;
}

ContactsDatastore.prototype = {
  _DS_LOADED_EVENT: 'datastore_loaded',
  _DS_NAME: 'contacts',
  _ORIGIN_TRAIL: 'provider.gaiamobile.org/manifest.webapp',

  _promiseResolution: function(resolve, reject) {
    if (!this.datastore) {
      this._datastoreLoading = false;
      this._datastoreLoaded = false;
      reject({
        name: 'DatastoreNotFound'
      });
    }
    else {
      this._datastoreLoading = false;
      this._datastoreLoaded = true;
      resolve(this.datastore);
    }
  },

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
          self._promiseResolution(resolve, reject);
        });
        return;
      }

      self._datastoreLoading = true;
      navigator.getDataStores(self._DS_NAME).then(function(stores) {
        var targetOwner = 'app://' + self.provider + self._ORIGIN_TRAIL;

        for (var j = 0; j < stores.length; j++) {
          if (stores[j].owner === targetOwner) {
            self.datastore = stores[j];
            break;
          }
        }

        document.dispatchEvent(new CustomEvent(self._DS_LOADED_EVENT));
        self._promiseResolution.bind(self)(resolve, reject);

      }, reject);
    });
  }
};
