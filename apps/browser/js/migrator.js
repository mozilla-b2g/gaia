'use strict';
/* global BookmarksDatabase */
/* global BrowserDB */

/**
The browser migrator is in charge of migrating bookmarks to the homescreen in
the 2.0 release. It's called from FTU via an inter-app communication channel
during an upgrade step.
*/

(function(exports) {

  function Migrator() {
    navigator.mozSetMessageHandler('connection', this.onConnection.bind(this));
  }

  Migrator.prototype = {

    /**
     * A list of pending bookmarks to migrate.
     */
    _pendingBookmarks: [],

    start: function() {
      // Probably should not happen, but just to be safe we early exit in case
      // we get a second migrate message.
      if (this.migrating) {
        return;
      }
      this.migrating = true;

      this.iteratePending = this._iteratePending.bind(this);

      BrowserDB.init(() => {
        BrowserDB.getBookmarks(bookmarks => {
          this._pendingBookmarks = bookmarks;
          this.iteratePending();
        });
      });
    },

    _iteratePending: function() {

      // If there are no bookmarks left, we're done
      if (!this._pendingBookmarks.length) {
        window.close();
        return;
      }

      var nextBookmark = this._pendingBookmarks.shift();
      var descriptor = {
        id: nextBookmark.uri,
        url: nextBookmark.uri,
        name: nextBookmark.title,
        icon: nextBookmark.iconUri
      };

      BookmarksDatabase.add(descriptor).then(this.iteratePending);
    },

    onConnection: function(connectionRequest) {
      if (connectionRequest.keyword !== 'migrate-bookmarks') {
        return;
      }

      var port = this.port = connectionRequest.port;
      port.onmessage = this.start.bind(this);
      port.start();
    }
  };

  exports.migrator = new Migrator();

}(window));
