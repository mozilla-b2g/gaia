/* global module */
'use strict';


var PlaylistHelper = {

  mainTitle: function(element) {
    return element.findElement('.list-main-title').text();
  },

  songTitle: function(element) {
    return element.findElement('.list-song-title').text();
  },

  songIndex: function(element) {
    return element.findElement('.list-song-index').text();
  }

};


module.exports = PlaylistHelper;
