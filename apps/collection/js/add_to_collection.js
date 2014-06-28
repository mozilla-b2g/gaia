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
          var newPinned = new PinnedHomeIcon(event.data.identifier);

          // Only allow pinning a record once.
          for (var i = 0, iLen = fresh.pinned.length; i < iLen; i++) {
              if (fresh.pinned[i].identifier === newPinned.identifier) {
                return;
              }
          }

          fresh.pinned.push(newPinned);
          CollectionsDatabase.put(fresh);
        });
    }
  };

  exports.addToCollection = new AddToCollection();
}(window));
