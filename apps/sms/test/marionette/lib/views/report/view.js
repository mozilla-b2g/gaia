'use strict';

/* global module */

var ReportAccessor = require('./accessors');

function ReportView(client) {
  this.client = client;
  this.accessors = new ReportAccessor(client);
}

ReportView.prototype = {
  back: function() {
    this.client.switchToShadowRoot(this.accessors.header);
    this.accessors.headerActionButton.tap();
    this.client.switchToShadowRoot();
  }
};

module.exports = ReportView;
