'use strict';

/*
 * A helper module for the keyboard framework in system app.
 */

var Marionette = require('marionette-client');

function System(client) {
  this.client = client.scope({ searchTimeout: 20000 });
  this.actions = new Marionette.Actions(client);
}

module.exports = System;

// Selectors for the DOM in system app.
System.Selector = Object.freeze({
  keyboards: '#keyboards'
});

System.prototype = {
  // getters for DOM elements in keyboard app
  get keyboards() {
    return this.client.findElement(System.Selector.keyboards);
  },

  /**
   * Wait for keyboard frame trasition end.
   */
  waitForKeyboardFrameDisplayed: function() {
    client.waitFor(function() {
      return this.keyboardFrameDisplayed();
    }.bind(this));
  },

  waitForKeyboardFrameHidden: function() {
    client.waitFor(function() {
      return this.keyboardFrameHidden();
    }.bind(this));
  },

  keyboardFrameDisplayed: function() {
    // Switch to System app.
    client.switchToFrame();

    // Wait for the keyboard pop up and switch to it.
    var keyboards = this.keyboards;

    var currentTransform = keyboards.cssProperty('transform');
    var expectedTransform = 'matrix(1, 0, 0, 1, 0, 0)';

    return (currentTransform === expectedTransform);
  },

  keyboardFrameHidden: function() {
    // Switch to System app.
    client.switchToFrame();

    var keyboards = this.keyboards;

    var height = keyboards.scriptWith(function(frame) {
      return frame.clientHeight;
    });

    var currentTransform = keyboards.cssProperty('transform');
    var expectedTransform = 'matrix(1, 0, 0, 1, 0, '+ height +')';

    return (currentTransform === expectedTransform);
  },

  /**
   * Switch to active keyboard frame.
   */
  switchToActiveKeyboardFrame: function() {
    var client = this.client;
    // Don't call switchToApp here, since keyboard frame itself would not
    // follow the rule of AppWindow.
    var keyboardFrame = client.findElement('#keyboards iframe:not(.hide)');
    client.switchToFrame(keyboardFrame);
  }
};
