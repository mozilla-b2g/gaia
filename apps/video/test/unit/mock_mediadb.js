/* exported MockMediaDB, MediaDB */
'use strict';

var MediaDB;

var MockMediaDB = (function() {

  function MockMediaDB(blob) {
    this.blob = blob;

    this.OPENING = 'opening';     // this is initializing itself
    this.UPGRADING = 'upgrading'; // this is upgrading database
    this.READY = 'ready';         // this is available and ready for use
    this.NOCARD = 'nocard';       // Unavailable because there is no sd card
    this.UNMOUNTED = 'unmounted'; // Unavailable because card unmounted
    this.CLOSED = 'closed';       // Unavailable because closed() was called
  }

  MockMediaDB.prototype = {

    getFile: function getFile(filename, callback) {

      callback(this.blob);
    },

    updateMetadata: function updateMetadata() {
    }
  };

  return MockMediaDB;

}());
