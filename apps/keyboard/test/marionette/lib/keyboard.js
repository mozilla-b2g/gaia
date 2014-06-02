'use strict';

function Keyboard (client) {
  this.client = client;
}
module.exports = Keyboard;

Keyboard.ORIGIN =  'app://keyboard.gaiamobile.org';

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
    var keyboards = client.findElement('#keyboards'),
    classes = keyboards.getAttribute('class'),
    transitionIn = keyboards.getAttribute('data-transition-in');
    return ( classes.indexOf('hide') == -1 ) && transitionIn !== 'true';
  },

  /**
   * Switch to active keyboard frame.
   */
  switchToActiveKeyboardFrame: function() {
    var client = this.client;
    // Don't call switchToApp here, since keyboard frame itself would not
    // follow the rule of AppWindow.
    var keyboardFrame = client.findElement('iframe[src*="' +
                                           Keyboard.ORIGIN + '"]');
    client.switchToFrame(keyboardFrame);
  }
};
