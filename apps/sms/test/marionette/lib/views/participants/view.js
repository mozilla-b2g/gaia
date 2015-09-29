'use strict';

/* global module */

var ParticipantsAccessor = require('./accessors');

function ParticipantsView(client) {
  this.client = client;
  this.accessors = new ParticipantsAccessor(client);
}

ParticipantsView.prototype = {
  back: function() {
    this.client.switchToShadowRoot(this.accessors.header);
    this.accessors.headerActionButton.tap();
    this.client.switchToShadowRoot();
  }
};

module.exports = ParticipantsView;
