/* global module */
'use strict';

function FakeGlobalOverlayAppNoPerms(client, origin) {
  this.client = client;
  this.origin = origin ||
                ('app://' + FakeGlobalOverlayAppNoPerms.DEFAULT_ORIGIN);
}

module.exports = FakeGlobalOverlayAppNoPerms;

FakeGlobalOverlayAppNoPerms.DEFAULT_ORIGIN =
  'fakeglobaloverlayapp_noperms.gaiamobile.org';

FakeGlobalOverlayAppNoPerms.Selector = Object.freeze({
  title : 'h1'
});

FakeGlobalOverlayAppNoPerms.prototype = {
  client: null,

  get title() {
    return this.client.findElement(FakeGlobalOverlayAppNoPerms.Selector.title);
  },

  launch: function() {
    this.client.switchToFrame();
    this.client.apps.launch(this.origin);
    this.client.apps.switchToApp(this.origin);
  },

  waitForTitleShown: function(shouldBeShown) {
    this.client.waitFor(function() {
      var shown = this.title.displayed();
      return shown === shouldBeShown;
    }.bind(this));
  },

  close: function() {
    this.client.apps.close(this.origin);
  }
};
