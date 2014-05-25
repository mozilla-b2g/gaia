'use strict';

/*
 * A helper module for built-in keyboard app and
 * the keyboard framework in system app.
 */
var Marionette = require('marionette-client');

function Keyboard (client) {
  this.client = client.scope({ searchTimeout: 20000 });
  this.actions = new Marionette.Actions(client);
}
module.exports = Keyboard;

Keyboard.ORIGIN =  'app://keyboard.gaiamobile.org';
Keyboard.MANIFEST_URL =  'app://keyboard.gaiamobile.org/manifest.webapp';

/* Selectors for the DOM in built-in keyboard app and system app */
Keyboard.Selector = Object.freeze({
  keyboards: '#keyboards',
  imeSwitchingKey: '.keyboard-type-container[data-active] ' +
    '.keyboard-key[data-keycode="-3"]',
  imeMenu: 'form.ime-menu',
  imeNotification: '#keyboard-show-ime-list'
});

Keyboard.prototype = {
  /**
   * Wait for keyboard frame trasition end.
   */
  waitForDisplayed: function() {
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

  get keyboards() {
    return this.client.findElement(Keyboard.Selector.keyboards);
  },

  get imeSwitchingKey() {
    return this.client.findElement(Keyboard.Selector.imeSwitchingKey);
  },

  get imeMenu() {
    return this.client.findElement(Keyboard.Selector.imeMenu);
  },

  get imeNotification() {
    return this.client.findElement(Keyboard.Selector.imeNotification);
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
