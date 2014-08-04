'use strict';

/* global BaseCollection */
/* global CollectionIcon */
/* global CollectionsDatabase */
/* global eme */
/* global HomeIcons */

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

      var grid = document.getElementById('grid');
      CollectionIcon.init(grid.maxIconSize);

      CollectionsDatabase.get(event.data.collectionId).then(fresh => {
        var collection = BaseCollection.create(fresh);

        eme.init()
        .then(() => HomeIcons.init())
        .then(() => {
          collection.dropHomeIcon(event.data.identifier);
        });
      });
    }
  };

  exports.addToCollection = new AddToCollection();
}(window));
