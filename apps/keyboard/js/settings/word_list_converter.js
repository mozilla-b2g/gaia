/* global module */

'use strict';

(function() {

var namespace;

try {
  namespace = window;
} catch(e) {
  namespace = module.exports;
}

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
  this.frequency = 0;
  // store the count for balancing the tst
  this.count = 0;
};

// Constructor for creating a TST Tree
var TSTTree = function(ch) {
  this.table = {};
};

// Insert a word into the TSTTree
TSTTree.prototype.insert = function(node, word, freq) {
  var ch = word[0];

  if (!node) {
    node = new TSTNode(ch);
  }

  if (ch < node.ch) {
    node.left = this.insert(node.left, word, freq);
  } else if(ch > node.ch) {
    node.right = this.insert(node.right, word, freq);
  } else {
    node.frequency = Math.max(node.frequency, freq);
    if (word.length > 1) {
      node.center = this.insert(node.center, word.substring(1), freq);
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

TSTTree.prototype.sortLevelByFreq = function(node) {
  // Collect nodes on the same level
  var nodes = [];
  this.collectLevel(nodes, node);

  // Sort by frequency

  nodes.sort(function(node1, node2){
    return node1.ch.charCodeAt(0) - node2.ch.charCodeAt(0);
  });
  nodes.sort(function(node1, node2){
    return node2.frequency - node1.frequency;
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

  // promote to root the letter with the highest maximum frequency
  // of a suffix starting with this letter
  node = this.promoteNodeToRoot(node, this.sortLevelByFreq(node));

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

  this.words.forEach(function(wordFreq) {
    var word = wordFreq.w;
    var freq = wordFreq.f;

    // Find the longest word in the dictionary
    this.maxWordLength = Math.max(this.maxWordLength, word.length);

    tstRoot = tree.insert(tstRoot, word + _EndOfWord, freq);

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
// In the JS version, since we're not directly writing to a file, 'output' is a
// Uint8Array. We use an offset to record the position where we have written to
// 'output'.
var TSTBlobBuilder = function(nodes, characterFrequency, maxWordLength) {
  this._nodes = nodes;
  this._characterFrequency = characterFrequency;
  this._maxWordLength = maxWordLength;
  this._output = null;
  // JSConv: a position of 0 is meaningful, so we use |undefined| here to denote
  //         uninitialized value.
  this._outputPos = undefined;
};

TSTBlobBuilder.prototype.debug = function(msg) {
  if (_DEBUG) {
    console.log(msg);
  }
};

TSTBlobBuilder.prototype.toBlobArray = function() {
  var nodeslen = this._computeOffsets();

  // JSConv: The blob is (15 + (numCharTableEntry*6) + nodeslen) bytes long
  //         Let's pre-allocate the array for better performance.
  //         15 is (header/12B + maxWordLength/1B + charTableEntryCount/2B)
  //         6 is (charCode/2B + charFrequency/4B)

  this._output =
    new Uint8Array(15 + (6 * Object.keys(this._characterFrequency).length) +
                   nodeslen);

  this._outputPos = 0;

  // 12-byte header with version number
  this._output[this._outputPos++] = 'F'.charCodeAt(0);
  this._output[this._outputPos++] = 'x'.charCodeAt(0);
  this._output[this._outputPos++] = 'O'.charCodeAt(0);
  this._output[this._outputPos++] = 'S'.charCodeAt(0);
  this._output[this._outputPos++] = 'D'.charCodeAt(0);
  this._output[this._outputPos++] = 'I'.charCodeAt(0);
  this._output[this._outputPos++] = 'C'.charCodeAt(0);
  this._output[this._outputPos++] = 'T'.charCodeAt(0);
  this._output[this._outputPos++] = 0;
  this._output[this._outputPos++] = 0;
  this._output[this._outputPos++] = 0;
  this._output[this._outputPos++] = 1;

  // Output the length of the longest word in the dictionary.
  // This allows to easily reject input that is longer
  this._output[this._outputPos++] = Math.min(this._maxWordLength, 255);

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

  this._output[this._outputPos++] = (characters.length >> 8) & 0xFF;

  this._output[this._outputPos++] = characters.length & 0xFF;

  characters.forEach(function(chFreq) {
    var charCode = chFreq.ch.charCodeAt(0);

    this._output[this._outputPos++] = (charCode >> 8) & 0xFF;
    this._output[this._outputPos++] = charCode & 0xFF;

    var freq = chFreq.freq;
    this._output[this._outputPos++] = (freq >> 24) & 0xFF;
    this._output[this._outputPos++] = (freq >> 16) & 0xFF;
    this._output[this._outputPos++] = (freq >> 8) & 0xFF;
    this._output[this._outputPos++] = freq & 0xFF;
  }, this);

  // Write the nodes of the tree to the array.
  this._nodes.forEach(function(node) {
    this._emitNode(node);
  }, this);

  return this._output.buffer;
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
  this._output[this._outputPos++] = (x >> 16) & 0xFF;
  this._output[this._outputPos++] = (x >> 8) & 0xFF;
  this._output[this._outputPos++] = x & 0xFF;
};

TSTBlobBuilder.prototype._emitNode = function(node) {
  var charcode = (node.ch == _EndOfWord) ? 0 : node.ch.charCodeAt(0);

  var cbit = (0 !== charcode) ? 0x80 : 0;
  var sbit = (charcode > 255) ? 0x40 : 0;
  var nbit = node.next ? 0x20 : 0;

  var freq;
  if (0 === node.frequency) {
    // zero means profanity
    freq = 0;
  } else {
    // values > 0 map the range 1 to 31
    freq = 1 + Math.floor(node.frequency * 31);
  }

  var firstbyte = cbit | sbit | nbit | (freq & 0x1F);
  this._output[this._outputPos++] = firstbyte;

  if (cbit) { // If there is a character for this node
    if (sbit) { // if it is two bytes long
      this._output[this._outputPos++] = charcode >> 8;
    }
    this._output[this._outputPos++] = charcode & 0xFF;
  }

  // Write the next node if we have one
  if (nbit) {
    this._writeUint24(node.next.offset);
  }
};



var WordListConverter = function(words) {
  this.blob = undefined;

  // JSConv: we're being strict here: the words can either be an array of words,
  // or an array of {w: word, f: freq} objects, but cannot be mix of the two.
  // Also, if it's the object type, we expect f to be within [0, 1) range,
  // exclusive on "1" side.

  words.reduce(function(prevType, word) {
    var thisType = typeof word;
    if (thisType !== prevType) {
      throw 'Type mismatch. previous: ' + prevType + ', this: ' + thisType;
    }

    if ('object' === thisType) {
      if (!('w' in word)) {
        throw '"w" field not found in word';
      }
      if (!('f' in word)) {
        throw '"f" field not found in word';
      }
      // note: using (f < 0 || f>= 1) causes false negative for f === NaN
      if (!(word.f >= 0 && word.f < 1)) {
        throw '"f" value not in allowed range';
      }
    }

    return thisType;
  }, typeof words[0]);

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

  // JSConv: if the words do not contain frequency information, attach 0.3
  // uniform frequency. We can't use 0 (special meaning for prediction engine
  // and we can't use 1 either (which overflows after normalization), so just
  // use a 0.3 that becomes 10 in _emitNode(). 10 is an empirical value for best
  // predictions result with user dictionary.
  if ('string' === typeof words[0]){
    words = words.map(function(word) {
     return {w: word, f: 0.3};
    });
  }

  var tstBuilder = new TSTBuilder(words);
  tstBuilder.build();

  var nodes = new TSTSerializer(tstBuilder.getTreeRoot()).serializeToNodes();

  this.blob =
    new TSTBlobBuilder(nodes,
                       tstBuilder.getCharacterFrequency(),
                       tstBuilder.getMaxWordLength())
    .toBlobArray();

  return this.blob;
};

exports.WordListConverter = WordListConverter;

})(namespace);

})();
