'use strict';

/* global module */

var SELECTORS = Object.freeze({
  main: '.panel-ReportView',
  header: '#information-report-header',
  headerActionButton: '.action-button'
});

function ReportAccessor(client) {
  this.client = client;
}

ReportAccessor.prototype = {
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

module.exports = ReportAccessor;
