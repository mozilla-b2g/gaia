'use strict';

var TextSelection = require('./text_selection');

function FakeTextSelectionApp(client) {
  this.client = client;

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
  topRightInput: '#top-right-input',
  normalDiv: '#noneditable',
  nonSelectedDiv: '#noneditable-userselectnone'
});

FakeTextSelectionApp.ORIGIN = 'app://faketextselectionapp.gaiamobile.org';

FakeTextSelectionApp.prototype = {
  get bubbleVisiblity() {
    return this.textSelection.visibility;
  },

  get width() {
    return this.client.executeScript(function() {
      return window.wrappedJSObject.innerWidth;
    });
  },

  get nonSelectedDiv() {
    return this._getElement('nonSelectedDiv');
  },

  get normalDiv() {
    return this._getElement('normalDiv');
  },

  get centerInput() {
    return this._getElement('centerInput');
  },

  get bottomLeftInput() {
    return this._getElement('bottomLeftInput');
  },

  get bottomRightInput() {
    return this._getElement('bottomRightInput');
  },

  get topLeftInput() {
    return this._getElement('topLeftInput');
  },

  get topRightInput() {
    return this._getElement('topRightInput');
  },

  _getElement: function(target) {
    var element = this.client.helper.waitForElement(
      FakeTextSelectionApp.Selector[target]);
    element.location = element.location();
    return element;
  },

  /**
   *
   * Show text selection dialog on element.
   *       
   * @param {String} ele query string of dom element.
   */
  longPress: function(target) {
    var dom = this.client.helper.waitForElement(
      FakeTextSelectionApp.Selector[target]);
    // wait for keyboard showing up first
    this.textSelection.longPress(dom);
  },

  // Copy element from fromEle and paste it to toEle.
  copyTo: function(fromEle, toEle) {
    this.longPress(fromEle);
    this.textSelection.pressCopy();
    this.longPress(toEle);
    this.textSelection.pressPaste();
  },

  // Cut element from fromEle and paste it to toEle.
  cutTo: function(fromEle, toEle) {
    this.longPress(fromEle);
    this.textSelection.pressCut();
    this.longPress(toEle);
    this.textSelection.pressPaste();
  },

  // Select all of ele and cut it.
  selectAllAndCut: function(ele) {
    this.longPress(ele);
    this.textSelection.pressSelectAll();
    this.textSelection.pressCut();
  }
};
