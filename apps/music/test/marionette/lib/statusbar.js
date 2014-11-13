/* global module */
'use strict';

function Statusbar(client) {
  this.client = client;
}

module.exports = Statusbar;

Statusbar.prototype = {
  get element() {
    this.client.switchToFrame();
    return this.client.findElement('#statusbar');
  },

  get maxPlayingIndicator() {
    return this.element.findElement('#statusbar-maximized #statusbar-playing');
  },

  get minPlayingIndicator() {
    return this.element.findElement('#statusbar-minimized #statusbar-playing');
  },

  waitForPlayingIndicatorShown: function(shouldBeShown) {
    this.client.waitFor(function() {
      return this.maxPlayingIndicator.displayed() === shouldBeShown ||
             this.minPlayingIndicator.displayed() === shouldBeShown;
    }.bind(this));
  }
};
