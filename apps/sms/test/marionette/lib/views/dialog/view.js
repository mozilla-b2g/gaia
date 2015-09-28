'use strict';

/* global module */

var DialogAccessor = require('./accessors');

function DialogView(client) {
  this.client = client;
  this.accessors = new DialogAccessor(client);
}

DialogView.prototype = {
  chooseAction: function(actionName) {
    this.accessors.waitToAppear();

    var actionButtons = this.accessors.buttons;
    for (var i = 0; i < actionButtons.length; i++) {
      var actionButton = actionButtons[i];
      if (actionButton.text().toLowerCase() === actionName.toLowerCase()) {
        actionButton.tap();
        break;
      }
    }
  }
};

module.exports = DialogView;
