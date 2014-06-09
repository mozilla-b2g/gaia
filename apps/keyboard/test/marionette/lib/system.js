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
  keyboards: '#keyboards',
  imeMenu: 'form.ime-menu',
  imeNotification: '#keyboard-show-ime-list'
});

System.prototype = {
  // getters for DOM elements in keyboard app
  get keyboards() {
    return this.client.findElement(System.Selector.keyboards);
  },

  get imeMenu() {
    return this.client.findElement(System.Selector.imeMenu);
  },

  get imeNotification() {
    return this.client.findElement(System.Selector.imeNotification);
  },

  /**
   * Wait for keyboard frame trasition end.
   */
  waitForKeyboardFrameDisplayed: function() {
    client.waitFor(function() {
      return this.keyboardFrameDisplayed();
    }.bind(this));
  },

  keyboardFrameDisplayed: function() {
    // Switch to System app.
    client.switchToFrame();

    // Wait for the keyboard pop up and switch to it.
    var keyboards = this.keyboards;
    var classes = keyboards.getAttribute('class');
    var transitionIn = keyboards.getAttribute('data-transition-in');

    return ( classes.indexOf('hide') == -1 ) && transitionIn !== 'true';
  },

  keyboardFrameHidden: function() {
    // Switch to System app.
    client.switchToFrame();

    var keyboards = this.keyboards;
    var classes = keyboards.getAttribute('class');
    var transitionOut = keyboards.getAttribute('data-transition-out');

    return ( classes.indexOf('hide') != -1 ) && transitionOut !== 'true';
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
  },

  selectImeOption: function selectImeOption(index) {
    var imeOption = this.imeMenu.findElement('li[data-id="' + index + '"]');
    imeOption.click();
  },

  dragDownUtilityTray: function dragDownUtilityTray() {
    client.switchToFrame();

    var statusbar = client.findElement('#statusbar');
    this.actions.flick(statusbar, 100, 0, 100, 300, 500).perform();

    var utilityTray = client.findElement('#utility-tray');
    var trayHeight = utilityTray.scriptWith(function(tray) {
      return tray.clientHeight;
    });

    // wait for utility tray to show completely
    client.waitFor(function() {
      var currentTransform = utilityTray.cssProperty('transform');
      var expectedTransform = 'matrix(1, 0, 0, 1, 0, '+ trayHeight +')';
      return (currentTransform === expectedTransform);
    });
  }
};
