/* global module */
'use strict';

function SongsTab(client) {
  this.client = client;
}

module.exports = SongsTab;

SongsTab.prototype = {
  get element() {
    return this.client.findElement('#views-list');
  },

  get songs() {
    return this.element.findElements('.list-item');
  },

  play: function(index) {
    index = index || 0;
    this.songs[index].click();
  }
};
