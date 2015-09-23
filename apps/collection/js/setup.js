'use strict';

/* global CollectionsDatabase */

(function(exports) {

  const PRE_INSTALLED_COLLECTIONS_FILE = 'js/pre_installed_collections.json';

  function Setup() {
    navigator.mozSetMessageHandler('connection', this.onConnection.bind(this));
  }

  function fetch(aPath, aResponseType, aMimeType) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest({
        mozAnon: true,
        mozSystem: true
      });
      xhr.open('GET', aPath, true);

      if (aMimeType) {
        xhr.overrideMimeType(aMimeType);
      }
      if (aResponseType) {
        xhr.responseType = aResponseType;
      }

      xhr.onload = () => {
        if (!(xhr.status === 200 | xhr.status === 0)) {
          reject(new Error('Unknown response when getting data.'));
          return;
        }

        resolve(xhr.response);
      };

      xhr.onerror = () => {
        reject(new Error('file not found'));
      };

      xhr.send();
    });
  }

  Setup.prototype = {
    onConnection: function(connectionRequest) {
      if (connectionRequest.keyword !== 'setup') {
        return;
      }

      var port = this.port = connectionRequest.port;
      port.onmessage = this.start.bind(this);
      port.start();
    },

    /**
     * It performs the initialization task.
     */
    start: function(event) {
      if (this.initializing) {
        // Initialization in progress
        return;
      }

      this.initializing = true;

      fetch(PRE_INSTALLED_COLLECTIONS_FILE, '',
            'application/json').then((response) => {
        this.populate(JSON.parse(response));
      }).catch((e) => {
        this.onError(e);
      });
    },

    /**
     * This method is in charge of adding pre-intalled collections to datastore.
     */
    populate: function(data) {
      var collections = data.collections || [];
      this.number = collections.length;

      if (this.number === 0) {
        // Nothing to populate
        this.onFinish();
      } else {
        var onFinish = this.onFinish.bind(this);
        collections.forEach((collection) => {
          if (collection.pinned && collection.pinned.length) {
            collection.pinned.forEach((appInfo, idx) => {
              var identifier = appInfo.join('-');
              collection.pinned[idx] = {
                identifier: identifier,
                type: 'homeIcon'
              };
            });
          }
          fetch(collection.icon, 'blob').then((blob) => {
            collection.iconBlob = blob;
            return CollectionsDatabase.add(collection);
          }).then(onFinish).catch(onFinish);
        });
      }
    },

    /**
     * This method is performed when a collection has been added or there is
     * no pre-installed collections.
     */
    onFinish: function() {
      if (--this.number > 0) {
        return;
      }

      this.initializing = false;
      this.port.postMessage('Done');
      window.close();
    },

    /**
     * This method is performed when an error happens reading configuration.
     */
    onError: function(error) {
      this.initializing = false;
      this.port.postMessage('Failed');
      console.error('Failed while reading the configuration file',
                    error.message);
    }
  };

  exports.setup = new Setup();
}(window));
