'use strict';

/* global module */

var SELECTORS = Object.freeze({
  main: '.panel-GroupView',
  header: '#information-group-header'
});

function ParticipantsAccessor(client) {
  this.client = client;
}

ParticipantsAccessor.prototype = {
  get header() {
    return this.client.helper.waitForElement(SELECTORS.header);
  },

  waitToAppear: function() {
    return this.client.helper.waitForElement(SELECTORS.main);
  }
};

module.exports = ParticipantsAccessor;
