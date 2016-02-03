/* global module */
'use strict';

function Statusbar(client) {
  this.client = client;
}

module.exports = Statusbar;

Statusbar.Selector = Object.freeze({
  playingIndicator: '#statusbar-playing'
});

Statusbar.prototype = {
  client: null,

  get playingIndicator() {
    this.client.switchToFrame();
    return this.client.findElement(Statusbar.Selector.playingIndicator);
  },

  waitForPlayingIndicatorShown: function(shouldBeShown) {
    if (shouldBeShown) {
      this.client.helper.waitForElement(this.playingIndicator);
    } else {
      this.client.helper.waitForElementToDisappear(this.playingIndicator);
    }
  }
};
