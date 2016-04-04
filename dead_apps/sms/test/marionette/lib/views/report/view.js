'use strict';

/* global module */

var ReportAccessor = require('./accessors');

function ReportView(client, parentView) {
  this.client = client;
  this.parentView = parentView;
  this.accessors = new ReportAccessor(client);
}

ReportView.prototype = {
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

module.exports = ReportView;
