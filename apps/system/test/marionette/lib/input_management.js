'use strict';

/**
 * A helper module for the input management framework in system app.
 */

var Marionette = require('marionette-client');

function InputManagement(client) {
  this.client = client.scope({ searchTimeout: 20000 });
  this.actions = new Marionette.Actions(client);
}

module.exports = InputManagement;

// Selectors for the DOM in system app.
InputManagement.Selector = Object.freeze({
  inputWindows: '#keyboards .inputWindow',
  imeMenu: 'form.ime-menu',
  imeNotification: '#keyboard-show-ime-list'
});

InputManagement.prototype = {
  // getters for DOM elements in keyboard app
  get inputWindows() {
    return this.client.findElements(InputManagement.Selector.inputWindows);
  },

  get imeMenu() {
    return this.client.findElement(InputManagement.Selector.imeMenu);
  },

  get imeNotification() {
    return this.client.findElement(InputManagement.Selector.imeNotification);
  },

  /**
   * Wait for keyboard frame trasition end.
   */
  waitForKeyboardFrameDisplayed: function() {
    this.client.waitFor(function() {
      return this.keyboardFrameDisplayed();
    }.bind(this));
  },

  keyboardFrameDisplayed: function() {
    // Switch to System app.
    this.client.switchToFrame();

    // Wait for the keyboard pop up and switch to it.
    // This is satisfied as long as one inputWindow pops up.
    var inputWindows = this.inputWindows;

    var expectedTransform = 'matrix(1, 0, 0, 1, 0, 0)';

    return inputWindows.some(function(inputWindow) {
      var currentTransform = inputWindow.cssProperty('transform');
      return (currentTransform === expectedTransform);
    });
  },

  keyboardFrameHidden: function() {
    // Switch to System app.
    this.client.switchToFrame();

    // This is satisfied only when all inputWindows are regarded as
    // having slided to the bottom.
    var inputWindows = this.inputWindows;

    return inputWindows.every(function(inputWindow) {
      var height = inputWindow.scriptWith(function(frame) {
        return frame.clientHeight;
      });

      var currentTransform = inputWindow.cssProperty('transform');
      var expectedTransform = 'matrix(1, 0, 0, 1, 0, '+ height +')';

      return (currentTransform === expectedTransform);
    });
  },

  /**
   * Switch to active keyboard frame.
   */
  switchToActiveKeyboardFrame: function() {
    var client = this.client;
    // Don't call switchToApp here, since keyboard frame itself would not
    // follow the rule of AppWindow.
    var keyboardFrame =
      client.findElement('#keyboards .inputWindow.active iframe');
    client.switchToFrame(keyboardFrame);
  },

  selectImeOption: function selectImeOption(index) {
    var imeOption = this.imeMenu.findElement('li[data-id="' + index + '"]');
    imeOption.click();
  },

  dragDownUtilityTray: function dragDownUtilityTray() {
    this.client.switchToFrame();

    var topPanel = this.client.findElement('#top-panel');
    var chain = this.actions.press(topPanel, 100, 0).moveByOffset(100, 300);
    chain.release().perform();

    var utilityTray = this.client.findElement('#utility-tray');
    var ambientIndicator = this.client.findElement('#ambient-indicator');
    var trayHeight = utilityTray.size().height - ambientIndicator.size().height;

    // wait for utility tray to show completely
    this.client.waitFor(function() {
      var currentTransform = utilityTray.cssProperty('transform');
      var expectedTransform = 'matrix(1, 0, 0, 1, 0, ' + trayHeight + ')';
      return (currentTransform === expectedTransform);
    });
  },

  /**
   * Ensure that the number of input windows is >= the given count.
   */
  ensureInputWindowCount: function(count) {
    // wait for the 2nd keyboard is loaded
    var inputWindows = this.inputWindows;
    this.client.waitFor(function() {
      return (inputWindows.length >= count);
    });
  }
};
