// This script contains the TST structure, methods to predict words
// The TST will be serialized into the same indexedDB as
// the word container by the userWorker.js script
// The maximum predictions from this script is limited to 2
// since only a maximum of 3 suggestions are displayed, we don't want to 
// remove the correct suggestions altogether
// The maximum number of corrections from input is limted to 10
// 
// The control flow is marked as follows:
// 1. The latin.js script requests the userWorker.js script to
//    provide suggestions
// 	  It passes the words in the indexedDB to the worker
//    It also passes a hasVersionChanged flag
//    This flag determines if a new TST is to be generated
// 	  The worker then fetches (or generates) a TST, 
//    balances it, passes it back to latin.js which puts it back in the iDB
// 2. If a new TST is to be generated, the worker will make a new one 
//    using this script
//    Or it will ask this script for predictions
// 3. Once the worker has predictions ready, 
//    it will transfer the iDB and the predictions to latin.js
//

"use strict";

// This TST script is taken from 
// https://github.com/jandre/js-ternary-tree/blob/master/ternary-tree.js
// The search function in the original script has been removed
// A new predict function has been made to cater to the needs
var Node = function() {
    function Node(character, is_word_end) {
        var self = this;
        self.character = character;
        self.left_node = null;
        self.right_node = null;
        self.center_node = null;
        self.is_word_end = is_word_end;
        self.count = 0;
        return self;
    };
    Node.prototype = {
        set_word_end: function() {
            var self = this;
            self.is_word_end = true;
        },
        left: function(node) {
            var self = this;
            if (node != undefined && node != null) {
                self.left_node = node;
            }
            return self.left_node;
        },
        right: function(node) {
            var self = this;
            if (node != undefined && node != null) {
                self.right_node = node;
            }
            return self.right_node;
        },
        center: function(node) {
            var self = this;
            if (node != undefined && node != null) {
                self.center_node = node;
            }
            return self.center_node;
        }
    };
    return Node;
}();


var TernaryTree = function() {
    function TernaryTree() {
        var self = this;
        self.root = null;
        return self;
    };
    TernaryTree.prototype = {
        _add: function(word, position, node_accessor) {
            var self = this;
            if (word == null || word == "")
                return;
            var node = node_accessor();
            if (node == null) {
                node = new Node(word[position], false);
                node_accessor(node);
                
            }
            var char = node.character;
            if (word[position] < char) {
                self._add(word, position, function(n) { 
                    return node.left(n); } );
            } else if (word[position] > char) {
                self._add(word, position, function(n) { 
                    return node.right(n); } );
            } else {
                if (position == (word.length - 1)) {
                    node.set_word_end();
                    /* node.is_word_end = true;*/
                } else {
                    self._add(word, position + 1, 
                        function(n) { return node.center(n); } );
                }
            }
        },

        add: function(word) {
            /* add a string to the tree */
            var self = this;
            var node_accessor = function(node) {
                if (node != undefined && node != null)
                    self.root = node;
                return self.root;
            };
            self._add(word, 0, node_accessor);
            self.setCount(self.root);
            return self;
        },

        setCount: function(node) {
            var self = this;
            if(!node)
                return 0;
            node.count = self.setCount(node.left_node) + 
                         self.setCount(node.right_node) + 1;
            self.setCount(node.center_node);
            return node.count;
        }
    }
    return TernaryTree;
}();

var UserPrediction = function() {
	const maxCandidates = 10; // limit number of candidates to consider

	const maxNumberOfSuggestions = 2; // One does not make many mistakes
	const maxDistance = 3; // Levenshtein distance of 3

	var tree = new TernaryTree();
	var maxWordLength;

	// This function is passed an object store of the iDB
	// It fetches all the words and make an unbalanced TST from them
	function createTree(objStore) {
        for(var prop in objStore) {
            tree.add(prop);
        }
        balanceTree(tree.root);
	}

	// This function balances the TST using rotations as per the AVL Tree
	function balanceTree() {
        // Turns out balancing a TST like a binary tree is not
        // a very advantageous process
        // We leave the tree unbalanced for now to focus on better predictions
	}

    /*
    function rotateLeft(node) {
        var temp = node.right;
        node.right = temp.left;
        temp.left = node;
        return temp;
    }

    function rotateRight(node) {
        var temp = node.left;
        node.left = temp.right;
        temp.right = node;
        return temp;
    }
    */

    function setNearbyKeys(nearbyKeys) {
        // Make a map here and use it in predict
        console.log('setNearbyKeys called with nearbyKeys: ' + nearbyKeys);
    }

	// This function will predict words matching the input
	function predict(prefix){
        
        console.log('predict called with prefix: ' + prefix);
	}

    return {
        setDictionary: createTree,
        setNearbyKeys: setNearbyKeys,
        predict: predict
    };
}();
