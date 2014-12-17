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
   * XXXX: this function will mock mozChromeEvent event to simulate gecko
   *       has successfully select content and trigger text_selection_dialog
   *       displaying.
   *       
   * @param {String} ele query string of dom element.
   */
  press: function(target) {
    var boxInfo = this.client.executeScript(
      function(ele) {
        var activeDom = document.querySelector(ele);
        activeDom.click();
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
    this.client.executeScript(function(boxInfoTop, boxInfoBottom,
                                       boxInfoLeft, boxInfoRight) {
      window.dispatchEvent(new CustomEvent('mozChromeEvent', {
        detail: {
          type: 'selectionstatechanged',
          detail: {
            visible: true,
            commands: {
              canPaste: true,
              canCut: true,
              canCopy: true,
              canSelectAll: true
            },
            offsetY: 0,
            offsetX: 0,
            zoomFactor: 1,
            rect: {
              top: boxInfoTop,
              bottom: boxInfoBottom,
              left: boxInfoLeft,
              right: boxInfoRight
            },
            states: ['mouseup']
          }
        }
      }));
    }, [boxInfo.top, boxInfo.bottom, boxInfo.left, boxInfo.right]);
  }
};
