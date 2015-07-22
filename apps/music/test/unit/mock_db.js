/* exported MockDatabase */
'use strict';

var MockDatabase = {

  cancelEnumeration: function() {},

  _mockResultsMetadataAlbum: [
    {
      metadata: {
        album: 'Crime of the Century',
        artist: 'Supertramp'
      }
    },
    {
      metadata: {
        album: 'Crisis? What Crisis?',
        artist: 'Supertramp'
      }
    },
    {
      metadata: {
        album: 'Even in the Quietests Moments...',
        artist: 'Supertramp'
      }
    },
    {
      metadata: {
        album: 'Breakfast in America',
        artist: 'Supertramp'
      }
    }
  ],

  enumerate: function(key, range, direction, callback) {

    switch (key) {
    case 'metadata.album':
      this._mockResultsMetadataAlbum.forEach((entry) => callback(entry));
      // the end
      callback(null);
      break;
    }
    return 1;
  },

  enumerateAll: function(key, range, direction, callback) {
    var results = [];

    switch (key) {
    case 'metadata.album':
      results = results.concat(this._mockResultsMetadataAlbum);
      break;
    }

    callback(results);
  },

  count: function(key, range, callback) {
    var result = 0;

    switch (key) {
    case 'metadata.album':
      result = this._mockResultsMetadataAlbum.length;
      break;
    }

    callback(result);
  }
};
