'use strict';

var Base = require('./base.js');


function KeyboardSettings(client) {
  this.client = client.scope({ searchTimeout: 500 });

  Base.call(this, client, KeyboardSettings.ORIGIN);
}

module.exports = KeyboardSettings;

KeyboardSettings.ORIGIN =  'app://keyboard.gaiamobile.org';

KeyboardSettings.Selectors = Object.freeze({
  autoCorrectCheckBox: '#cb-autoCorrect'
});

KeyboardSettings.prototype = {
  __proto__: Base.prototype,

  get autoCorrectCheckBox() {
    return this.client.findElement(
      KeyboardSettings.Selectors.autoCorrectCheckBox);
  },

  get autoCorrect() {
    return this.autoCorrectCheckBox.scriptWith(function(ele) {
      return ele.wrappedJSObject.checked;
    });
  },

  clickAutoCorrectOption: function() {
    var currentSwitch = this.client.settings.get('keyboard.autocorrect');

    this.autoCorrectCheckBox.click();

    this.client.waitFor(() => {
      return (this.autoCorrect !== currentSwitch);
    });
  },

  waitForReady: function() {
    this.client.waitFor(() => {
      return this.autoCorrectCheckBox.displayed();
    });
  }
};

