/* globals SyncProvider, GaiaGrid */

(function(exports) {

  'use strict';

  // Name of the datastore we pick up places from
  var STORE_NAME = 'bookmarks_store';

  function formatBookmark(bookmark, filter) {
    return {
      data: new GaiaGrid.Bookmark({
        id: bookmark.url,
        name: bookmark.name || bookmark.url,
        url: bookmark.url,
        icon: bookmark.icon
      })
    };
  }

  function Bookmarks() {}

  Bookmarks.prototype = {

    __proto__: SyncProvider.prototype,

    name: 'Bookmarks',

    storeName: STORE_NAME,

    filterData: function(place) {
      return place.url.startsWith('app://') ||
       place.url === 'about:blank';
    },

    adapt: formatBookmark,

    matchFilter: function(result, filter) {
      return result.url.indexOf(filter) > -1;
    },

    add: function(place) {
      SyncProvider.prototype.add.call(this, place);
    }

  };

  exports.Bookmarks = new Bookmarks();
  exports.Bookmarks.init();

}(window));
