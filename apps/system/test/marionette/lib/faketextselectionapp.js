'use strict';

var TextSelection = require('./text_selection');
var SelectionHelper = require('./selection_helper');

function FakeTextSelectionApp(client) {
  this.client = client;

  this.client.apps.launch(FakeTextSelectionApp.ORIGIN);
  this.client.apps.switchToApp(FakeTextSelectionApp.ORIGIN);

  this.textSelection = new TextSelection(this.client);
}

module.exports = FakeTextSelectionApp;

FakeTextSelectionApp.Selector = Object.freeze({
  // dialogposition.html
  DialogPositionBottomLeftInput: '#bottom-left-input',
  DialogPositionBottomRightInput: '#bottom-right-input',
  DialogPositionCenterInput: '#center-input',
  DialogPositionTopLeftInput: '#top-left-input',
  DialogPositionTopRightInput: '#top-right-input',
  // functionality.html
  FunctionalitySourceInput: '#functionality-source',
  FunctionalityTargetInput: '#functionality-target',
  // noneditable.html
  NonEditableCenterInput: '#ne-center-input',
  NonEditableNormalDiv: '#noneditable',
  NonEditableNonSelectedDiv: '#noneditable-userselectnone',
  // bug.html
  BugCenterInput: '#bug-center-input',
  BugBottomInput: '#bug-bottom-input',
  BugNormalDiv: '#bug-normal-div',
  // bug1120358.html
  BugContent: '#bug-content',
  // bug1120316.html
  BugInput: '#bug-input',
  BugTextarea: '#bug-textarea',
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

  get DialogPositionCenterInput() {
    return this._getElement('DialogPositionCenterInput');
  },

  get DialogPositionBottomLeftInput() {
    return this._getElement('DialogPositionBottomLeftInput');
  },

  get DialogPositionBottomRightInput() {
    return this._getElement('DialogPositionBottomRightInput');
  },

  get DialogPositionTopLeftInput() {
    return this._getElement('DialogPositionTopLeftInput');
  },

  get DialogPositionTopRightInput() {
    return this._getElement('DialogPositionTopRightInput');
  },

  get FunctionalitySourceInput() {
    return this._getElement('FunctionalitySourceInput');
  },

  get FunctionalityTargetInput() {
    return this._getElement('FunctionalityTargetInput');
  },

  get NonEditableCenterInput() {
    return this._getElement('NonEditableCenterInput');
  },

  get NonEditableNormalDiv() {
    return this._getElement('NonEditableNormalDiv');
  },

  get NonEditableNonSelectedDiv() {
    return this._getElement('NonEditableNonSelectedDiv');
  },

  get BugCenterInput() {
    return this._getElement('BugCenterInput');
  },

  get BugButtomInput() {
    return this._getElement('BugButtomInput');
  },

  get BugNormalDiv() {
    return this._getElement('BugNormalDiv');
  },

  get BugContent() {
    return this._getElement('BugContent');
  },

  get BugInput() {
    return this._getElement('BugInput');
  },

  get BugTextarea() {
    return this._getElement('BugTextarea');
  },

  _getElement: function(target) {
    var element = this.client.helper.waitForElement(
      FakeTextSelectionApp.Selector[target]);
    element.location = element.location();
    element.selectionHelper = new SelectionHelper(this.client, element);
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

  longPressByPosition: function(target, x, y) {
    var dom = this.client.helper.waitForElement(
      FakeTextSelectionApp.Selector[target]);
    // wait for keyboard showing up first
    this.textSelection.longPressByPosition(dom, x, y);
  },

  copy: function(fromEle) {
    this.longPress(fromEle);
    this.textSelection.pressCopy();
  },

  paste: function(toEle) {
    this.longPress(toEle);
    this.textSelection.pressPaste();
  },

  cut: function(fromEle) {
    this.longPress(fromEle);
    this.textSelection.pressCut();
  },

  // Copy element from fromEle and paste it to toEle.
  copyTo: function(fromEle, toEle) {
    this.copy(fromEle);
    this.paste(toEle);
  },

  // Cut element from fromEle and paste it to toEle.
  cutTo: function(fromEle, toEle) {
    this.cut(fromEle);
    this.paste(toEle);
  },

  // Select all of ele and cut it.
  selectAllAndCut: function(ele) {
    this.longPress(ele);
    this.textSelection.pressSelectAll();
    this.textSelection.pressCut();
  },

  selectAll: function(ele) {
    this.longPress(ele);
    this.textSelection.pressSelectAll();
  },

  setTestFrame: function(frameName) {
    this.client.executeScript(function(frameName) {
      window.wrappedJSObject.location.href = '/' + frameName + '.html';
    }, [frameName]);
  },

  switchToTestApp: function() {
    this.textSelection.switchToCurrentApp();
  }
};
