/* global module, require */
'use strict';

var assert = require('assert');

var ListviewHelper = {

  albumArtForListItem: function(client, item) {
    assert.ok(item);

    var src;
    client.waitFor(function() {
      src = item.findElement('.list-album-art').getAttribute('src');
      return src !== null;
    });
    return src;
  }

};


module.exports = ListviewHelper;
