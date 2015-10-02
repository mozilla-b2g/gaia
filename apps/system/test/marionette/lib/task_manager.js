'use strict';

(function(module) {
  var TaskManager = function(client) {
    this.client = client;
  };

  TaskManager.prototype = {
    selectors: {
      element: '#task-manager',
      scrollElement: '#cards-view',
      newSheetButton: '#task-manager-new-sheet-button',
      newPrivateSheetButton: '#task-manager-new-private-sheet-button',
      cards: '#cards-view li',
      screenshot: '.screenshotView',
      icon: '.appIcon'
    },
    get element() {
      return this.client.helper.waitForElement(this.selectors.element);
    },

    get cards() {
      return this.client.findElements(this.selectors.cards);
    },

    get newSheetButton() {
      return this.client.helper.waitForElement(this.selectors.newSheetButton);
    },

    get newPrivateSheetButton() {
      return this.client.helper.waitForElement(
        this.selectors.newPrivateSheetButton);
    },

    show: function() {
      this.client.switchToFrame();
      this.client.executeAsyncScript(function() {
        var win = window.wrappedJSObject;
        win.addEventListener('cardviewshown', function wait() {
          win.removeEventListener('cardviewshown', wait);
          marionetteScriptFinished();
        });
        win.dispatchEvent(new CustomEvent('holdhome'));
      });
    },

    hide: function() {
      this.client.switchToFrame();
      this.client.executeAsyncScript(function() {
        var win = window.wrappedJSObject;
        win.addEventListener('cardviewclosed', function wait() {
          win.removeEventListener('cardviewclosed', wait);
          marionetteScriptFinished();
        });
        win.dispatchEvent(new CustomEvent('home'));
      });
    },

    getIconForCard: function(idx) {
      var card = this.cards[idx];
      this.client.waitFor(card.displayed.bind(card));
      var icon = card.findElement(this.selectors.icon);
      this.client.waitFor(icon.displayed.bind(icon));
      return icon;
    }
  };

  module.exports = TaskManager;
})(module);
