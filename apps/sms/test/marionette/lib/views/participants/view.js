'use strict';

/* global module */

var ParticipantsAccessor = require('./accessors');

function ParticipantsView(client, parentView) {
  this.client = client;
  this.parentView = parentView;
  this.accessors = new ParticipantsAccessor(client);
}

ParticipantsView.prototype = {
  get headerAction() {
    return this.accessors.header.getAttribute('action');
  },

  back: function() {
    this.client.switchToShadowRoot(this.accessors.header);
    this.accessors.headerActionButton.tap();
    this.client.switchToShadowRoot();
    this.parentView.accessors.waitToAppear();
    return this.parentView;
  }
};

module.exports = ParticipantsView;
