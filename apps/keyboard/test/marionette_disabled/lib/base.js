'use strict';

function Base(client, origin) {
  this.client = client;
  this.origin = origin;

  this.elements = {};
}

Base.prototype = {
  launch: function() {
    this.client.apps.launch(this.origin);
    this.switchTo();
  },

  switchTo: function() {
    this.client.switchToFrame();
    this.client.apps.switchToApp(this.origin);

    this.waitForReady();
  },

  close: function() {
    this.client.apps.close(this.origin);
  },

  waitForReady: function() {
    this.client.helper.waitForElement('body');
  }
};


module.exports = Base;
