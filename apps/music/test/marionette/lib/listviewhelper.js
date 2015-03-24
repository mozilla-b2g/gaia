/* global module, require */
'use strict';

var assert = require('assert');

var ListviewHelper = {

  albumArtForListItem: function(client, item) {
    assert.ok(item);

    var bg;
    client.waitFor(function() {
      bg = item.cssProperty('background-image');
      return bg !== 'none';
    });
    return bg;
  }

};


module.exports = ListviewHelper;
