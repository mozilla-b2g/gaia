
'use strict';

/**
 * This file defines an asynchronous storage in charge of saving descriptions
 * of bookmarks when the homescreen app is not running (see bug 991897).
 *
 * The homescreen will show these bookmarks once rendered. It will clear the
 * storage after installing all of them.
 */
(function(exports) {

  var key = 'installed_bookmarks_while_homescreen_was_not_running';

  function clear(callback) {
    asyncStorage.removeItem(key, callback);
  }

  function getAll(callback) {
    asyncStorage.getItem(key, function(bookmarks) {
      callback(bookmarks || []);
    });
  }

  function add(data, callback) {
    getAll(function gotAll(list) {
      list.push(data);
      asyncStorage.setItem(key, list, callback);
    });
  }

  exports.BookmarksStorage = {
   /*
    * This method returns an array of bookmark's descriptors
    *
    * @param{Function} This callback will receive the list of descriptors
    */
    getAll: getAll,

    /*
     * This method adds a bookmark's descriptor in the storage
     *
     * @param{Object} The bookmark's descriptor
     */
    add: add,

    /*
     * This method removes all descriptors stored
     *
     * @param{Function} This callback will be performed when the operation
     *                  finishes
     */
    clear: clear
  };

}(window));
