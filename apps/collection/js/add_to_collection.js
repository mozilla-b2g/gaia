'use strict';

/* global CollectionsDatabase */
/* global PinnedHomeIcon */

(function(exports) {

  function AddToCollection() {
    navigator.mozSetMessageHandler('connection', this.onConnection.bind(this));
  }

  AddToCollection.prototype = {
    onConnection: function(connectionRequest) {
      if (connectionRequest.keyword !== 'add-to-collection') {
        return;
      }

      var port = this.port = connectionRequest.port;
      port.onmessage = this.addToCollection.bind(this);
      port.start();
    },

    addToCollection: function(event) {
      CollectionsDatabase.get(event.data.collectionId).then(fresh => {
          fresh.pinned = fresh.pinned.concat(
            new PinnedHomeIcon(event.data.applicationId));
          CollectionsDatabase.put(fresh);
        });
    }
  };

  exports.addToCollection = new AddToCollection();
}(window));
