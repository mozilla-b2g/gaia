'use strict';

(function(exports) {

/*
 * This script is largely Python-to-JavaScript conversion from xml2dict.py.
 * Old comments are copied here, except those beginning with "JSConv", which
 * are comments during the conversion.
 */

const _EndOfWord = String.fromCharCode(0);

const _DEBUG = true;

// Data Structure for TST Tree

// Constructor for creating a new TSTNode
var TSTNode = function(ch) {
  this.ch = ch;
  this.left = this.center = this.right = null;
  // store the count for balancing the tst
  this.count = 0;
};

// Constructor for creating a TST Tree
var TSTTree = function(ch) {
  this.table = {};
};

// Insert a word into the TSTTree
TSTTree.prototype.insert = function(node, word) {
  var ch = word[0];

  if (!node) {
    node = new TSTNode(ch);
  }

  if (ch < node.ch) {
    node.left = this.insert(node.left, word);
  } else if(ch > node.ch) {
    node.right = this.insert(node.right, word);
  } else {
    if (word.length > 1) {
      node.center = this.insert(node.center, word.substring(1));
    }
  }

  return node;
};

// Balance the TST
// set the number of children nodes
TSTTree.prototype.setCount = function(node) {
  if (!node) {
      return 0;
  }

  node.count = this.setCount(node.left) + this.setCount(node.right) + 1;

  this.setCount(node.center);

  return node.count;
};

TSTTree.prototype.rotateRight = function(node) {
  var tmp = node.left;

  // move the subtree between tmp and node
  node.left = tmp.right;

  // swap tmp and node
  tmp.right = node;

  // restore count field
  node.count = (node.left ? node.left.count : 0) +
                 (node.right ? node.right.count : 0) + 1;
  tmp.count = (tmp.left ? tmp.left.count : 0) + tmp.right.count + 1;

  return tmp;
};

TSTTree.prototype.rotateLeft = function(node) {
  var tmp = node.right;

  // move the subtree between tmp and node
  node.right = tmp.left;

  // swap tmp and node
  tmp.left = node;

  // restore count field
  node.count = (node.left ? node.left.count : 0) +
                 (node.right ? node.right.count : 0) + 1;
  tmp.count = tmp.left.count + (tmp.right ? tmp.right.count : 0) + 1;

  return tmp;
};

TSTTree.prototype.divide = function(node, divCount) {
  var leftCount = node.left ? node.left.count : 0;

  // if the dividing node is in the left subtree, go down to it
  if (divCount < leftCount) {
    node.left = this.divide(node.left, divCount);
    // on the way back from the dividing node to the root, do right rotations
    node = this.rotateRight(node);
  } else if (divCount > leftCount) {
    node.right = this.divide(node.right, divCount - leftCount - 1);
    node = this.rotateLeft(node);
  }

  return node;
};

// balance level of TST
TSTTree.prototype.balanceLevel = function(node) {
  if (!node) {
    return node;
  }

  // make center node the root
  node = this.divide(node, Math.floor(node.count / 2));
  // balance subtrees recursively
  node.left = this.balanceLevel(node.left);
  node.right = this.balanceLevel(node.right);

  node.center = this.balanceTree(node.center);

  return node;
};

TSTTree.prototype.collectLevel = function(level, node) {
  if (!node) {
    return;
  }

  level.push(node);
  this.collectLevel(level, node.left);
  this.collectLevel(level, node.right);
};

TSTTree.prototype.annotateNodes = function(node) {
  // Collect nodes on the same level
  var nodes = [];
  this.collectLevel(nodes, node);

  nodes.sort(function(node1, node2){
    return node1.ch.charCodeAt(0) - node2.ch.charCodeAt(0);
  });

  // Add next/prev pointers to each node
  var prev = null;
  nodes.forEach(function (node, index) {
    node.next = (index < nodes.length - 1) ? nodes[index + 1] : null;
    node.prev = prev;
    prev = node;
  });

  return nodes[0];
};

// find node in the subtree of root and promote it to root
TSTTree.prototype.promoteNodeToRoot = function(root, node) {
  if (node.ch < root.ch) {
    root.left = this.promoteNodeToRoot(root.left, node);
    return this.rotateRight(root);
  } else if (node.ch > root.ch) {
    root.right = this.promoteNodeToRoot(root.right, node);
    return this.rotateLeft(root);
  } else {
    return root;
  }
};

// balance the whole TST
TSTTree.prototype.balanceTree = function(node) {
  if (!node) {
    return;
  }

  node = this.promoteNodeToRoot(node, this.annotateNodes(node));

  // balance other letters on this level of the tree
  node.left = this.balanceLevel(node.left);
  node.right = this.balanceLevel(node.right);
  node.center = this.balanceTree(node.center);

  return node;
};

// balance the whole TST
TSTTree.prototype.balance = function(root) {
  this.setCount(root);

  root = this.balanceTree(root);

  return root;
};



var TSTBuilder = function(words) {
  this.words = words;

  this._built = false;

  this.maxWordLength = 0;
  this.characterFrequency = {};
  this.tstRoot = null;
};

TSTBuilder.prototype.debug = function(msg) {
  if (_DEBUG) {
    console.log(msg);
  }
};

TSTBuilder.prototype.build = function() {
  var tstRoot = null;
  var tree = new TSTTree();

  this.words.forEach(function(word) {
    // Find the longest word in the dictionary
    this.maxWordLength = Math.max(this.maxWordLength, word.length);

    tstRoot = tree.insert(tstRoot, word + _EndOfWord);

    // keep track of the letter frequencies
    word.split('').forEach(function(ch) {
      if (ch in this.characterFrequency) {
        this.characterFrequency[ch]++;
      } else {
        this.characterFrequency[ch] = 1;
      }
    }, this);
  }, this);

  tstRoot = tree.balance(tstRoot);

  this.tstRoot = tstRoot;
  this._built = true;
};

TSTBuilder.prototype.getTreeRoot = function() {
  if (!this._built) {
    throw Error('TST not built yet.');
  }

  return this.tstRoot;
};

TSTBuilder.prototype.getMaxWordLength = function() {
  if (!this._built) {
    throw Error('TST not built yet.');
  }

  return this.maxWordLength;
};

TSTBuilder.prototype.getCharacterFrequency = function() {
  if (!this._built) {
    throw Error('TST not built yet.');
  }

  return this.characterFrequency;
};



var TSTSerializer = function(tstRoot) {
  this._tstRoot = tstRoot;
  this._output = null;
};

TSTSerializer.prototype.debug = function(msg) {
  if (_DEBUG) {
    console.log(msg);
  }
};

// Serialize the tree to an array. Do it depth first, folling the
// center pointer first because that might give us better locality
TSTSerializer.prototype._serializeNode = function(node) {
  this._output.push(node);

  // JSConv: original offset assignment is removed as
  // offset will be overwritten anyway in computeOffsets.

  if (node.ch == _EndOfWord && node.center) {
    this.debug('nul node with a center!');
  }
  if (node.ch != _EndOfWord && !node.center) {
    this.debug('char node with no center!');
  }

  // do the center node first so words are close together
  if (node.center) {
    this._serializeNode(node.center);
  }

  if (node.left) {
    this._serializeNode(node.left);
  }

  if (node.right) {
    this._serializeNode(node.right);
  }
};

TSTSerializer.prototype.serializeToNodes = function() {
  this._output = [];
  this._serializeNode(this._tstRoot);

  return this._output;
};




// JSConv:
// In the JS version, since we're not directly writing to a file,
// 'output' is a JS array. We convert to UInt8Array when we
// finishes pushing to 'output'. This is because UInt8Array's length
// has to be decided at instantiation.
// XXX: See if we can pre-determine the length when instantiating
//      the buffer.
var TSTBlobBuilder = function(nodes, characterFrequency, maxWordLength) {
  this._nodes = nodes;
  this._characterFrequency = characterFrequency;
  this._maxWordLength = maxWordLength;
  this._output = null;
};

TSTBlobBuilder.prototype.debug = function(msg) {
  if (_DEBUG) {
    console.log(msg);
  }
};

TSTBlobBuilder.prototype.toBlobArray = function() {
  this._output = [];

  // JSConv: `nodeslen` in original code isn't used
  this._computeOffsets();

  // 12-byte header with version number
  this._output.push('F'.charCodeAt(0));
  this._output.push('x'.charCodeAt(0));
  this._output.push('O'.charCodeAt(0));
  this._output.push('S'.charCodeAt(0));
  this._output.push('D'.charCodeAt(0));
  this._output.push('I'.charCodeAt(0));
  this._output.push('C'.charCodeAt(0));
  this._output.push('T'.charCodeAt(0));
  this._output.push(0);
  this._output.push(0);
  this._output.push(0);
  this._output.push(1);

  // Output the length of the longest word in the dictionary.
  // This allows to easily reject input that is longer
  this._output.push(Math.min(this._maxWordLength, 255));

  // Output a table of letter frequencies. The search algorithm may
  // want to use this to decide which diacritics to try, for example.
  var characters = Object.keys(this._characterFrequency).map(function(ch) {
    return {ch: ch, freq: this._characterFrequency[ch]};
  }, this);

  characters.sort(function (chFreq1, chFreq2){
    return chFreq2.freq - chFreq1.freq;
  });

  // JSConv: on 16-bit and 32-bit writing:
  // The original Python code used big-endian conversion, so we
  // push MSB first down to LSB.

  this._output.push((characters.length >> 8) & 0xFF);

  this._output.push(characters.length & 0xFF);

  characters.forEach(function(chFreq) {
    var charCode = chFreq.ch.charCodeAt(0);

    this._output.push((charCode >> 8) & 0xFF);
    this._output.push(charCode & 0xFF);

    var freq = chFreq.freq;
    this._output.push((freq >> 24) & 0xFF);
    this._output.push((freq >> 16) & 0xFF);
    this._output.push((freq >> 8) & 0xFF);
    this._output.push(freq & 0xFF);
  }, this);

  // Write the nodes of the tree to the array.
  this._nodes.forEach(function(node) {
    this._emitNode(node);
  }, this);

  return this._output;
};


// Make a pass through the array of nodes and figure out the size and offset
// of each one.
TSTBlobBuilder.prototype._computeOffsets = function() {
  var offset = 0;

  this._nodes.forEach(function(node) {
    node.offset = offset;

    var charlen;
    if (node.ch == _EndOfWord) {
      charlen = 0;
    } else if (node.ch.charCodeAt(0) <= 255) {
      charlen = 1;
    } else {
      charlen = 2;
    }

    var nextlen = node.next ? 3 : 0;

    offset = offset + 1 + charlen + nextlen;
  });

  return offset;
};

TSTBlobBuilder.prototype._writeUint24 = function(x) {
  this._output.push((x >> 16) & 0xFF);
  this._output.push((x >> 8) & 0xFF);
  this._output.push(x & 0xFF);
};

TSTBlobBuilder.prototype._emitNode = function(node) {
  var charcode = (node.ch == _EndOfWord) ? 0 : node.ch.charCodeAt(0);

  var cbit = (0 !== charcode) ? 0x80 : 0;
  var sbit = (charcode > 255) ? 0x40 : 0;
  var nbit = node.next ? 0x20 : 0;

  // JSConv: uniform frequency
  const freq = 31;

  var firstbyte = cbit | sbit | nbit | (freq & 0x1F);
  this._output.push(firstbyte);

  if (cbit) { // If there is a character for this node
    if (sbit) { // if it is two bytes long
      this._output.push(charcode >> 8);
    }
    this._output.push(charcode & 0xFF);
  }

  // Write the next node if we have one
  if (nbit) {
    this._writeUint24(node.next.offset);
  }
};



var WordListConverter = function(words) {
  this.blob = undefined;
  this.words = words;
};

WordListConverter.prototype.debug = function(msg) {
  if (_DEBUG) {
    console.log(msg);
  }
};

WordListConverter.prototype.toBlob = function() {
  if (this.blob) {
    return this.blob;
  }

  var words = this.words;

  var tstBuilder = new TSTBuilder(words);
  tstBuilder.build();

  var nodes = new TSTSerializer(tstBuilder.getTreeRoot()).serializeToNodes();

  var blobArray =
    new TSTBlobBuilder(nodes,
                       tstBuilder.getCharacterFrequency(),
                       tstBuilder.getMaxWordLength())
    .toBlobArray();

  this.blob = new Uint8Array(blobArray);
  return this.blob;
};

exports.WordListConverter = WordListConverter;

})(window);
