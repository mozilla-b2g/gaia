/* global module */
'use strict';

function FakeDialerApp(client, origin) {
  this.client = client;
  this.origin = origin || ('app://' + FakeDialerApp.DEFAULT_ORIGIN);
}

module.exports = FakeDialerApp;

FakeDialerApp.DEFAULT_ORIGIN = 'fakedialerapp.gaiamobile.org';

FakeDialerApp.Selector = Object.freeze({
  title : 'h1'
});

FakeDialerApp.prototype = {
  client: null,

  get title() {
    return this.client.findElement(FakeDialerApp.Selector.title);
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

  getCallHeight: function() {
    this.client.switchToFrame();
    var oncallframe =
      this.client.helper.waitForElement('.attentionWindow.active iframe');
    this.client.switchToFrame(oncallframe);
    return this.client.executeScript(function() {
      return window.wrappedJSObject.innerHeight;
    });
  },

  focusAndWaitForResize: function() {
    this.client.switchToFrame();
    var oncallframe =
      this.client.helper.waitForElement('.attentionWindow.active iframe');
    this.client.switchToFrame(oncallframe);

    this.client.findElement('#input').click();

    this.client.executeAsyncScript(function() {
      var win = window.wrappedJSObject;
      win.addEventListener('resize', function resizeWait() {
        win.removeEventListener('resize', resizeWait);
        marionetteScriptFinished();
      });
    });
  },

  close: function() {
    this.client.apps.close(this.origin);
  }
};
