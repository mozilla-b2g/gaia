'use strict';

function TaskManager(client) {
  this.client = client.scope({
    searchTimeout: 20000
  });
}

module.exports = TaskManager;

TaskManager.prototype = {
  client: null,

  show: function() {
    this.client.switchToFrame();
    this.client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('holdhome'));
    });
    this.client.helper.waitForElement('#cards-view.active');
  },

  hide: function() {
    this.client.switchToFrame();
    this.client.executeAsyncScript(function() {
      var win = window.wrappedJSObject;
      win.addEventListener('cardviewclosed', function wait() {
        win.removeEventListener('cardviewclosed', wait);
        marionetteScriptFinished();
      });
      window.wrappedJSObject.taskManager.hide();
    });
  }
};
