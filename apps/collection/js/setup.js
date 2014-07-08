'use strict';

/* global CollectionsDatabase */

(function(exports) {

  const PRE_INSTALLED_COLLECTIONS_FILE = 'js/pre_installed_collections.json';

  function Setup() {
    navigator.mozSetMessageHandler('connection', this.onConnection.bind(this));
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

      var xhr = new XMLHttpRequest();
      xhr.overrideMimeType('application/json');
      xhr.open('GET', PRE_INSTALLED_COLLECTIONS_FILE, true);

      xhr.onload = function _xhrOnLoadFile() {
        if (!(xhr.status === 200 | xhr.status === 0)) {
          this.onError('Unknown response when getting data.');
          return;
        }

        try {
          this.populate(JSON.parse(xhr.responseText));
        } catch (ex) {
          this.onError(ex);
        }
      }.bind(this);

      xhr.onerror = function _xhrOnError() {
        this.onError('file not found');
      }.bind(this);

      xhr.send();
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
        collections.forEach(function(collection) {
          if (collection.pinned && collection.pinned.length) {
            collection.pinned.forEach((appInfo, idx) => {
              var identifier = appInfo.join('-');
              collection.pinned[idx] = {
                identifier: identifier,
                type: 'homeIcon'
              };
            });
          }
          CollectionsDatabase.add(collection).then(onFinish, onFinish);
        }.bind(this));
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
    },

    /**
     * This method is performed when an error happens reading configuration.
     */
    onError: function(error) {
      this.initializing = false;
      this.port.postMessage('Failed');
      console.error('Failed while reading the configuration file', error);
    }
  };

  exports.setup = new Setup();
}(window));
