/* global module, require */
'use strict';

var assert = require('assert');

var ListviewHelper = {

  albumArtForListItem: function(item) {
    assert.ok(item);

    var bg = item.cssProperty('background-image');
    return bg;
  }

};


module.exports = ListviewHelper;
