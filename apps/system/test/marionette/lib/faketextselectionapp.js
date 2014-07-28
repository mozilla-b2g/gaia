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
   *
   * Show text selection dialog on element.
   *
   * HACKING: We need to remove it once gecko is ready.
   * XXXX: this function will mock mozbrowsertextualmenu event to simulate gecko
   *       has successfully select content and trigger text_selection_dialog
   *       displaying.
   *       
   * @param {String} ele query string of dom element.
   */
  press: function(target) {

    var boxInfo = this.client.executeScript(
      function(ele) {
        var activeDom = document.querySelector(ele);
        var defaultPosition = activeDom.getBoundingClientRect();
        return {
          top: defaultPosition.top,
          left: defaultPosition.left,
          right: defaultPosition.right,
          bottom: defaultPosition.bottom
        };
      }, [FakeTextSelectionApp.Selector[target]]);

    // TextSelection dialog exists in system app scope.
    this.client.switchToFrame();
    var displayApp = this.textSelection._getDisplayedAppInfo();
    this.client.executeScript(function(appFrameId, boxInfoTop, boxInfoBottom,
                                       boxInfoLeft, boxInfoRight) {
      var appFrame = document.getElementById(appFrameId);
      var appWindow = appFrame.parentElement.parentElement;
      appWindow.dispatchEvent(new CustomEvent('mozbrowsertextualmenu', {
        detail: {
          canPaste: true,
          canCut: true,
          canCopy: true,
          canSelectAll: true,
          zoomFactor: 1,
          top: boxInfoTop,
          bottom: boxInfoBottom,
          left: boxInfoLeft,
          right: boxInfoRight
        }
      }));
    }, [displayApp.appWindowId, boxInfo.top, boxInfo.bottom,
        boxInfo.left, boxInfo.right]);
  }
};
