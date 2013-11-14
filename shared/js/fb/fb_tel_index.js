'use strict';

// This object implements a prefix tree (aka trie) for FB tel numbers
// TODO: Implement the Compact version of this tree (aka patricia tree)
var TelIndexer = {
  _MIN_TEL_LENGTH: 3,

  // Allows to index the number passed as parameter
  index: function(tree, number, dsId) {
    // For each length starting from the minimum (3)
    for (var k = this._MIN_TEL_LENGTH; k <= number.length; k++) {
      // For each number
      var str;
      for (var j = 0; j < number.length - 1; j++) {
        str = '';
        if (j + k <= number.length) {
          for (var h = j; h < (j + k); h++) {
            str += number.charAt(h);
          }
          this.insert(tree, str, dsId);
        }
      }
    }
  },

  // Inserts a number on the tree
  insert: function(tree, str, dsId) {
    var totalLength = str.length;

    var firstThreeStr = str.substring(0, this._MIN_TEL_LENGTH);

    var rootObj = tree[firstThreeStr];
    if (!rootObj) {
      rootObj = tree[firstThreeStr] = {
        keys: Object.create(null),
        leaves: Object.create(null)
      };
    }
    rootObj.keys[dsId] = true;

    var currentObj = rootObj, nextObj;
    for (var j = this._MIN_TEL_LENGTH; j < totalLength; j++) {
      nextObj = currentObj.leaves[str.charAt(j)];
      if (!nextObj) {
        nextObj = {
          keys: Object.create(null),
          leaves: Object.create(null)
        };
        currentObj.leaves[str.charAt(j)] = nextObj;
      }
      nextObj.keys[dsId] = true;
      currentObj = nextObj;
    }
  },

  // Search for a number (which can be partial) on the tree
  search: function(tree, number) {
    var out = [];
    var totalLength = number.length;
    var MIN_TEL_LENGTH = this._MIN_TEL_LENGTH;

    if (totalLength >= MIN_TEL_LENGTH) {
      var firstThreeStr = number.substring(0, MIN_TEL_LENGTH);
      var rootObj = tree[firstThreeStr];
      var currentObj, nextObj;
      if (rootObj && totalLength > MIN_TEL_LENGTH) {
        currentObj = rootObj;
        for (var j = MIN_TEL_LENGTH; j < totalLength; j++) {
          nextObj = currentObj.leaves[number.charAt(j)];
          if (!nextObj) {
            currentObj = null;
            break;
          }
          currentObj = nextObj;
        }
        if (currentObj !== null) {
          out = Object.keys(currentObj.keys);
        }
      }
      else if (rootObj) {
        out = Object.keys(rootObj.keys);
      }
    }

    return out;
  },

  // Removes a number from the tree
  // TODO: Compact the tree when a number is removed
  remove: function(tree, number, dsId) {
    var totalLength = number.length;
    var firstThreeStr = number.substring(0, this._MIN_TEL_LENGTH);

    var rootObj = tree[firstThreeStr];
    if (rootObj) {
      delete rootObj.keys[dsId];

      var currentObj = rootObj, nextObj;
      for (var j = this._MIN_TEL_LENGTH; j < totalLength; j++) {
        nextObj = currentObj.leaves[number.charAt(j)];
        if (!nextObj) {
          break;
        }
        delete nextObj.keys[dsId];
        currentObj = nextObj;
      }
    }
  }
};
