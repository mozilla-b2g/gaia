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
    var client = this.client;
    // Switch to System app.
    client.switchToFrame();
    // Wait for the keyboard pop up and switch to it.
    client.waitFor(function() {
      var keyboards = client.findElement('#keyboards'),
          classes = keyboards.getAttribute('class'),
          transitionIn = keyboards.getAttribute('data-transition-in');
      return ( classes.indexOf('hide') == -1 ) && transitionIn !== 'true';
    });
  },

  /**
   * Switch to active keyboard frame.
   */
  switchToActiveKeyboardFrame: function() {
    var client = this.client;
    client.apps.switchToApp(Keyboard.ORIGIN);
  }
};
