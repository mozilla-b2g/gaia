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
      CollectionsDatabase.get(event.data['collection-id']).then(function create(fresh) {
          fresh.pinned = fresh.pinned.concat(new PinnedHomeIcon(event.data['application-id']));
          CollectionsDatabase.put(fresh);
        }.bind(this));
    }
  };

  exports.addToCollection = new AddToCollection();
}(window));
