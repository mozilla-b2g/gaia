'use strict';
/* global Promise */

/**
 * MockCollectionsDatabase is a simple mock of a bunch of different
 * collections. It is useful because we do not have datastore in Firefox
 * nightly, and comes with a pre-populated set of collections.
 */

(function(exports) {

  //var categories = [];

  var installed = [
    {id: 'id1'},
    {id: 'id2'}
  ];

  exports.MockCollectionsDatabase = {

    getAllCategories: function() {
      return Promise.resolve(installed);
    }

  };

}(window));
