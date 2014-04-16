'use strict';

(function(exports) {

  // Todo: bookmark datastore logic.
  function BookmarkSource() {

  }

  BookmarkSource.prototype = {

    /**
     * Populates the initial bookmark data.
     */
    populate: function(success) {
      success([]);
    }

  };

  exports.BookmarkSource = BookmarkSource;

}(window));
