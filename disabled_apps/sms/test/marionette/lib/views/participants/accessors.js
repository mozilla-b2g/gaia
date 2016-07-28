'use strict';

/* global module */

var SELECTORS = Object.freeze({
  main: '.panel-GroupView',
  header: '#information-group-header',
  headerActionButton: '.action-button'
});

function ParticipantsAccessor(client) {
  this.client = client;
}

ParticipantsAccessor.prototype = {
  get header() {
    return this.client.helper.waitForElement(SELECTORS.header);
  },

  get headerActionButton() {
    return this.client.helper.waitForElement(SELECTORS.headerActionButton);
  },

  waitToAppear: function() {
    return this.client.helper.waitForElement(SELECTORS.main);
  }
};

module.exports = ParticipantsAccessor;
