/* jshint node: true */
'use strict';

function FTUHelper(client) {
  this.client = client;
}

FTUHelper.prototype = {
  client: null,
  FTU_URL: 'app://communications.gaiamobile.org',
  waitForFTU: function() {
    this.client.apps.switchToApp(this.FTU_URL);
  },
  clickThruPanel: function(panel_id, button_id) {
    if (panel_id == '#wifi') {
      // The wifi panel will bring up a screen to show it is scanning for
      // networks. Not waiting for this to clear will blow test timing and cause
      // things to fail.
      this.client.helper.waitForElementToDisappear('#loading-overlay');
    }
    // waitForElement is used to make sure animations and page changes have
    // finished, and that the panel is displayed.
    this.client.helper.waitForElement(panel_id);
    if (button_id) {
      var button = this.client.helper.waitForElement(button_id);
      button.click();
    }
  },
  close: function() {
    this.client.apps.close(this.FTU_URL);
  }
};

module.exports = {
  FTU: FTUHelper
};
