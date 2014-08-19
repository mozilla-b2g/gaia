'use strict';

var Actions = require('marionette-client').Actions;
var TextSelection = require('./text_selection');

function FakeTextSelectionApp(client) {
  this.client = client;
  this.actions = new Actions(this.client);

  this.client.apps.launch(FakeTextSelectionApp.ORIGIN);
  this.client.apps.switchToApp(FakeTextSelectionApp.ORIGIN);

  this.textSelection = new TextSelection(this.client);
}

module.exports = FakeTextSelectionApp;

FakeTextSelectionApp.Selector = Object.freeze({
  bottomLeftInput: '#bottom-left-input',
  bottomRightInput: '#bottom-right-input',
  centerInput: '#center-input',
  topLeftInput: '#top-left-input',
  topRightInput: '#top-right-input'
});

FakeTextSelectionApp.ORIGIN = 'app://faketextselectionapp.gaiamobile.org';

FakeTextSelectionApp.prototype = {
  get width() {
    return this.client.executeScript(function() {
      return window.wrappedJSObject.innerWidth;
    });
  },

  get centerInput() {
    return {
      location: this._getLocation('centerInput')
    };
  },

  get bottomLeftInput() {
    return {
      location: this._getLocation('bottomLeftInput')
    };
  },

  get bottomRightInput() {
    return {
      location: this._getLocation('bottomRightInput')
    };
  },

  get topLeftInput() {
    return {
      location: this._getLocation('topLeftInput')
    };
  },

  get topRightInput() {
    return {
      location: this._getLocation('topRightInput')
    };
  },

  _getLocation: function(target) {
    return this.client.helper.waitForElement(
      FakeTextSelectionApp.Selector[target]).location();
  },

  /**
   * Show text selection dialog on element.
   *       
   * @param {String} ele query string of dom element.
   */
  press: function(target) {
    this.client.helper.waitForElement(FakeTextSelectionApp.Selector[target])
      .tap(0, 0);

  }
};
