'use strict';

var Actions = require('marionette-client').Actions;
function SelectionHelper(client, element) {
  this.client = client;
  this.isInputOrTextarea =
    (element.getAttribute('tagName') === 'INPUT' ||
     element.getAttribute('tagName') === 'TEXTAREA');
  this.element = element;
  this.action = new Actions(this.client);
}

module.exports = SelectionHelper;

SelectionHelper.prototype = {
  get content() {
    if (this.isInputOrTextarea) {
      return this.element.getAttribute('value');
    } else {
      return this.element.text;
    }
  },

  get selectedContent() {
    return this.client.executeScript(this.getSelectionCmd() +
      'return sel.toString();', [this.element], null, 'system');
  },

  getSelectionCmd: function() {
    if (this.isInputOrTextarea) {
      return 'var sel = arguments[0].editor.selection;';
    } else {
      return 'var sel = window.getSelection();';
    }
  },

  selectionRectList: function(idx) {
    var cmd = this.getSelectionCmd() + 'return sel.getRangeAt(' + idx + ')' +
      '.getClientRects();';
    return this.client.executeScript(cmd, [this.element], null, 'system');
  },

  rangeCount: function() {
    var cmd = this.getSelectionCmd() + 'return sel.rangeCount;';
    return this.client.executeScript(cmd, [this.element], null, 'system');
  },

  /**
   * Move caret by absolute position.
   *       
   * @param {Object} data
   *                {caretA: {
   *                   offset: {
   *                      x: //poistion relative to element,
   *                      y: //poistion relative to element
   *                   },
   *                 caretB: {
   *                   offset: {
   *                     x: //poistion relative to element,
   *                     y: //poistion relative to element
   *                   }
   *                 }}
   *
   */
  moveCaretByPosition: function(data) {
    var caretPositions = this.selectionLocationHelper();
    if (data.caretA) {
      this.action.flick(this.element, caretPositions.caretA.x,
        caretPositions.caretA.y + 15,
        caretPositions.caretA.x + data.caretA.offset.x,
        caretPositions.caretA.y + 15 + data.caretA.offset.y).perform();
      this.client.wait(500);
    }
    if (data.caretB) {
      this.action.flick(this.element, caretPositions.caretB.x,
        caretPositions.caretB.y + 15,
        caretPositions.caretB.x + data.caretB.offset.x,
        caretPositions.caretB.y + 15 + data.caretB.offset.y).perform();
    }
  },

  /**
   * Move caret by word's position.
   *       
   * @param {Object} data
   *                {caretA: {offset: //integer}, caretB: {offset //integer}}
   *
   */
  moveCaretByWords: function(data) {
    if (!this.isInputOrTextarea) {
      console.log('only support input or textarea');
      return;
    }
    var caretA = data.caretA;
    var caretB = data.caretB;
    var caretPositions = this.selectionLocationHelper();
    var content = this.content;
    var contentLength = content.length;
    
    this.client.executeScript('arguments[0].setSelectionRange(' +
      (caretA ? caretA.offset : 0) + ',' +
      (contentLength + (caretB ? caretB.offset : 0)) + ' )',
    [this.element]);
    
    var newCaretPositions = this.selectionLocationHelper();

    var eltSize = this.element.size();
    this.action.tap(this.element, eltSize.width / 2, eltSize.height / 2)
      .wait(2).press(this.element, eltSize.width / 2, eltSize.height / 2).
      moveByOffset(0, 0).wait(2).release().perform();

    var flickPosition = {};

    if (caretA) {
      flickPosition.caretA = {
        offset: {
          x: newCaretPositions.caretA.x - caretPositions.caretA.x,
          y: newCaretPositions.caretA.y - caretPositions.caretA.y
        }
      };
    }
    if (caretB) {
      flickPosition.caretB = {
        offset: {
          x: newCaretPositions.caretB.x - caretPositions.caretB.x,
          y: newCaretPositions.caretB.y - caretPositions.caretB.y
        }
      };
    }
    this.moveCaretByPosition(flickPosition);
  },

  selectionLocationHelper: function(locationType) {
    var rangeCount = this.rangeCount();
    var firstRectList = this.selectionRectList(0);
    var lastRectList = this.selectionRectList(rangeCount - 1);
    var lastListLength = lastRectList.length;
    var firstRect = firstRectList[0];
    var lastRect = lastRectList[lastListLength - 1];
    var originX = this.element.location.x;
    var originY = this.element.location.y;
    var startPos = 'left';
    var endPos = 'right';
    var startYOffset, endYOffset;

    if (this.element.getAttribute('dir') === 'rtl') {
      startPos = 'right';
      endPos = 'left';
    }
    if (locationType === 'center') {
      startYOffset = firstRect.height / 2;
      endYOffset = lastRect.height / 2;
    } else if (locationType === 'caret') {
      startYOffset = firstRect.height + 5;
      endYOffset = lastRect.height + 5;
    } else {
      startYOffset = endYOffset = 0;
    }

    return {
      caretA: {
        x: firstRect[startPos] - originX,
        y: firstRect.top + startYOffset - originY
      },
      caretB: {
        x: lastRect[endPos] - originX,
        y: lastRect.top + endYOffset - originY
      }
    };
  },

  selectAll: function() {
    var cmd;
    if (this.isInputOrTextarea) {
      cmd = 'var len = arguments[0].value.length; arguments[0].focus();' +
        'arguments[0].setSelectionRange(0, len);';
    } else {
      cmd = 'var range = document.createRange();' +
        'range.setStart(arguments[0].firstChild, 0);' +
        'range.setEnd(arguments[0].lastChild, 0);' +
        'var sel = window.getSelection();' +
        'sel.removeAllRanges(); sel.addRange(range);';
    }
    this.client.executeScript(cmd, [this.element]);
  }
};
