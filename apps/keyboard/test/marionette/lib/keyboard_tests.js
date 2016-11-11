'use strict';

function KeyboardTests(client) {
  this.client = client;
}
module.exports = KeyboardTests;

KeyboardTests.ORIGIN = 'app://keyboardtests.gaiamobile.org';

KeyboardTests.prototype = {

  get textInputElement() {
    return this.client.findElement('#textInput');
  },

  launch: function() {
		var client = this.client;
    client.apps.launch(KeyboardTests.ORIGIN);
    client.apps.switchToApp(KeyboardTests.ORIGIN);
    client.helper.waitForElement('body');
  }
};
