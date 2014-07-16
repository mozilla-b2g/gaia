'use strict';

/* global BaseCollection */
/* global CollectionIcon */
/* global CollectionsDatabase */
/* global Common */
/* global eme */
/* global HomeIcons */
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

      var grid = document.getElementById('grid');
      CollectionIcon.init(grid.maxIconSize);

      CollectionsDatabase.get(event.data.collectionId).then(fresh => {
        var collection = BaseCollection.create(fresh);
        var newPinned = new PinnedHomeIcon(event.data.identifier);

        HomeIcons.init().then(() => {

          // If a record is already pinned, delete it so it appears first.
          for (var i = 0, iLen = collection.pinned.length; i < iLen; i++) {
              if (collection.pinned[i].identifier === newPinned.identifier) {
                collection.pinned.splice(i, 1);
                break;
              }
          }

          // If we don't have webicons, then we have likely never fetched this
          //collection. Make a call to the server to fetch the apps.
          if (!collection.webicons.length) {
            var options = collection.categoryId ?
              {categoryId: collection.categoryId} :
              {query: collection.query};

            eme.init()
              .then(() => eme.api.Apps.search(options))
              .then((response) => {
                collection.addWebResults(response.response.apps);
              })
              .then(() => {
                Common.getBackground(collection, grid.maxIconSize)
                  .then((bgObject) => {
                    collection.background = bgObject;
                    this.pinAndSave(newPinned, collection);
                  });
              });
          } else {
            this.pinAndSave(newPinned, collection);
          }
        });
      });
    },

    pinAndSave: function(newPinned, collection) {
      collection.pinned.unshift(newPinned);
      collection.renderIcon().then(() => {
        collection.save();
      });
    }
  };

  exports.addToCollection = new AddToCollection();
}(window));
