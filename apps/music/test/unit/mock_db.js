/* exported MockDatabase */
'use strict';

var MockDatabase = {

  cancelEnumeration: function() {},
  enumerateAll: function(key, range, direction, callback) {
    var results = [];

    switch (key) {
    case 'metadata.album':
      results.push( { metadata: {
        album: 'Crime of the Century',
        artist: 'Supertramp'
      } });
      results.push({ metadata: {
        album: 'Crisis? What Crisis?',
        artist: 'Supertramp'
      } });
      results.push({ metadata: {
        album: 'Even in the Quietests Moments...',
        artist: 'Supertramp'
      } });
      results.push({ metadata: {
        album: 'Breakfast in America',
        artist: 'Supertramp'
      } });
      break;
    }

    callback(results);
  }

};
