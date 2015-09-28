'use strict';

/* global module */

var ParticipantsAccessor = require('./accessors');

function ParticipantsView(client) {
  this.client = client;
  this.accessors = new ParticipantsAccessor(client);
}

ParticipantsView.prototype = {
  back: function() {
    this.accessors.header.scriptWith(function(header) {
      var event = document.createEvent('HTMLEvents');
      event.initEvent('action', true, true);
      header.dispatchEvent(event);
    });
  }
};

module.exports = ParticipantsView;
