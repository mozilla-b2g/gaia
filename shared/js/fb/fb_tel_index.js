'use strict';

/* globals utils */
/* exported TelIndexer */

// This object implements a prefix tree (aka trie) for FB tel numbers

function Node(number) {
  this.keys = Object.create(null);
  this.leaves = null;
  this.value = number;
}

var TelIndexer = {
  _MIN_TEL_LENGTH: 3,
  _INSERT_MODE: 'insert',

  _indexOf: function(array, value, byPrefix) {
    var out = -1;

    if (!Array.isArray(array)) {
      return out;
    }

    for (var j = 0, l = array.length; j < l; j++) {
      if (array[j].value === value || (byPrefix &&
                                       array[j].value.startsWith(value))) {
        out = j;
        break;
      }
    }
    return out;
  },

  _getStringVariants: function(number) {
    var out = [];

    var limit = number.length - this._MIN_TEL_LENGTH + 1;
    for (var j = 0; j < limit; j++) {
      out.push(number.substr(j));
    }
    return out;
  },

  // Allows to index the number passed as parameter
  index: function(tree, number, dsId) {
    var self = this;
    var variants = this._getStringVariants(number);

    variants.forEach(function(aVariant) {
      self._insert(tree, aVariant, dsId);
    });
  },

  // Inserts a substring in a node. dsId is the object id (uid) associated
  _insertInNode: function(node, str, dsId) {
    if (str.length === 0) {
      return;
    }

    var currentStr = str;
    var insertPointFound = false;
    var insertObj;
    var pointerOriginal = str.length;
    while (!insertPointFound && currentStr.length > 0) {
      var inextObj = this._indexOf(node.leaves, currentStr, 'prefix');
      if (inextObj !== -1) {
        insertPointFound = true;
        insertObj = node.leaves[inextObj];
      }
      else {
        currentStr = currentStr.substring(0, currentStr.length - 1);
      }
      pointerOriginal--;
    }

    if (insertPointFound) {
      if (insertObj.value === str) {
        // Exact insertion point
        insertObj.keys[dsId] = true;
      }
      else {
        var keys = Object.keys(insertObj.keys);
        // Let's check what's the gap
        var newString = insertObj.value.substring(0, currentStr.length);
        var restString = insertObj.value.substring(currentStr.length);

        insertObj.value = newString;

        if (restString.length > 0) {
          var newNode = new Node(restString);
          for (var j = 0; j < keys.length; j++) {
            newNode.keys[keys[j]] = true;
          }
          if (Array.isArray(insertObj.leaves)) {
            newNode.leaves = [];
            insertObj.leaves.forEach(function(aLeave) {
              newNode.leaves.push(aLeave);
            });
          }
          insertObj.leaves = [];
          insertObj.leaves.push(newNode);
        }
        insertObj.keys[dsId] = true;

        var restOriginal = str.substring(pointerOriginal + 1);
        // And the rest of the original string is inserted in the insertObj
        this._insertInNode(insertObj, restOriginal, dsId);
      }
    }
    else {
      var nextObj = new Node(str);
      nextObj.keys[dsId] = true;
      node.leaves = node.leaves || [];
      node.leaves.push(nextObj);
    }
  },

  // Compare function used for binary search
  _compare: function(a, b) {
    return a.localeCompare(b);
  },

  // Find the first level node (corresponding to the 3 first numbers)
  _getFirstLevelNode: function(tree, str, mode) {
    var out = null;

    var index;
    if (mode === this._INSERT_MODE) {
      index = this._indexOf(tree, str);
      if (index !== -1) {
        out = tree[index];
      }
    }
    else {
      index = utils.binarySearch(str, tree, {
        compareFunction: this._compare,
        arrayField: 'value'
      });

      if (index.length > 0) {
        out = tree[index[0]];
      }
    }
    return out;
  },

  // Orders the tree enabling binary search on the first levels
  orderTree: function(tree) {
    tree.sort(function(a, b) {
      return a.value.localeCompare(b.value);
    });
  },

  // Inserts a number on the tree
  _insert: function(tree, str, dsId) {
    var firstThreeStr = str.substring(0, this._MIN_TEL_LENGTH);
    var rootObj = this._getFirstLevelNode(tree, firstThreeStr,
                                          this._INSERT_MODE);
    if (!rootObj) {
      rootObj = new Node(firstThreeStr);
      tree.push(rootObj);
    }
    rootObj.keys[dsId] = true;

    this._insertInNode(rootObj, str.substring(this._MIN_TEL_LENGTH), dsId);
  },

  // Search a substring in a node
  _searchInNode: function(node, str) {
    var currentStr = str;
    var found = false;
    var pointerOriginal = str.length;
    var searchObj;
    while (!found && currentStr.length > 0) {
      var idxObj = this._indexOf(node.leaves, currentStr, 'prefix');
      if (idxObj !== -1) {
        found = true;
        searchObj = node.leaves[idxObj];
      }
      else {
        currentStr = currentStr.substring(0, currentStr.length - 1);
      }
      pointerOriginal--;
    }

    if (found) {
      if (searchObj.value === str) {
        return searchObj;
      }
      // Let's calculate what is the gap
      var restString = str.substr(pointerOriginal + 1);
      if (restString.length > 0) {
        return this._searchInNode(searchObj, restString);
      }
      else {
        return searchObj;
      }
    }
    else {
      return null;
    }
  },

  // Search for a number (which can be partial) on the tree
  search: function(tree, number) {
    var out = [];
    var totalLength = number.length;
    var MIN_TEL_LENGTH = this._MIN_TEL_LENGTH;

    if (totalLength >= MIN_TEL_LENGTH) {
      var firstThreeStr = number.substring(0, MIN_TEL_LENGTH);
      var rootObj = this._getFirstLevelNode(tree, firstThreeStr);

      if (rootObj) {
        if (totalLength === MIN_TEL_LENGTH) {
          out = Object.keys(rootObj.keys);
        }
        else {
          var node = this._searchInNode(rootObj,
                                        number.substring(MIN_TEL_LENGTH));
          if (node) {
            out = Object.keys(node.keys);
          }
        }
      }
    }
    return out;
  },

  // Removes a number from the tree
  remove: function(tree, number, dsId) {
    var self = this;
    var variants = this._getStringVariants(number);
    variants.forEach(function(aVariant) {
      self._unIndex(tree, aVariant, dsId);
    });
  },

  // Removes a partial string from a node
  _removeInNode: function(node, str, dsId) {
    if (str.length === 0) {
      return;
    }

    var currentStr = str;
    var found = false;
    var pointerOriginal = str.length;
    var searchObj;
    while (!found && currentStr.length > 0) {
      var idxObj = this._indexOf(node.leaves, currentStr, 'prefix');
      if (idxObj !== -1) {
        found = true;
        searchObj = node.leaves[idxObj];
      }
      else {
        currentStr = currentStr.substring(0, currentStr.length - 1);
      }
      pointerOriginal--;
    }

    if (found) {
      delete searchObj.keys[dsId];
      this._removeInNode(searchObj, str.substr(pointerOriginal + 1), dsId);
    }
  },

  // Removes a number from the tree
  // TODO: Compact the tree when a number is removed
  _unIndex: function(tree, number, dsId) {
    var firstThreeStr = number.substring(0, this._MIN_TEL_LENGTH);

    var rootObj = this._getFirstLevelNode(tree, firstThreeStr);
    if (rootObj) {
      delete rootObj.keys[dsId];
      this._removeInNode(rootObj, number.substr(this._MIN_TEL_LENGTH), dsId);
    }
  }
};
