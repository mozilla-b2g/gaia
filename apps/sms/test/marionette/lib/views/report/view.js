'use strict';

/* global module */

var ReportAccessor = require('./accessors');

function ReportView(client) {
  this.client = client;
  this.accessors = new ReportAccessor(client);
}

ReportView.prototype = {
  back: function() {
    this.accessors.header.scriptWith(function(header) {
      var event = document.createEvent('HTMLEvents');
      event.initEvent('action', true, true);
      header.dispatchEvent(event);
    });
  }
};

module.exports = ReportView;
