'use strict';

/* global module */

var ConversationAccessor = require('./accessors');

var appRoot = require('app-root-path');
// TODO Change the path once requireFromApp becomes its own module
var requireFromApp = require(appRoot +
  '/shared/test/integration/require_from_app').requireFromApp;

function ConversationView(client) {
  this.client = client;
  this.accessors = new ConversationAccessor(client);
}

ConversationView.prototype.callContact = function() {
  this.accessors.callButton.tap();

  var Dialer = requireFromApp('dialer', 'lib/dialer');
  var dialer = new Dialer(this.client);
  dialer.switchTo();
  return dialer;
};

module.exports = ConversationView;
