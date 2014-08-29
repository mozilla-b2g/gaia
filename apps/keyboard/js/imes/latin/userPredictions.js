// This script contains the TST structure, and methods to predict words
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
// 	  The worker then fetches (or generates) a TST
// 2. If a new TST is to be generated, the worker will make a new one 
//    using this script
//    Or it will ask this script for predictions
// 3. Once the worker has predictions ready, 
//    it will transfer the iDB and the predictions to latin.js
//

"use strict";

// This TST script is taken from 
// https://github.com/jandre/js-ternary-tree/blob/master/ternary-tree.js
// The search function in the original script has been modified
// A new predict function has been made to cater to the needs
var Node = function() {
  function Node(character, is_word_end) {
    var self = this;
    self.character = character;
    self.left_node = null;
    self.right_node = null;
    self.center_node = null;
    self.is_word_end = is_word_end;
    self.frequency = 0;
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
    },
    set_frequency: function(frequency) {
      var self = this;
      self.frequency = frequency;
    }
  };
  return Node;
}();


var TernaryTree = function() {
  function TernaryTree() {
    var self = this;
    self.root = null;
    // maxFrequency helps us in normalizing the weights within 0-31
    self.maxFrequency = 0;
    return self;
  };
  TernaryTree.prototype = {
    _add: function(word, position, node_accessor, frequency) {
      var self = this;
      var node = node_accessor();
      if (node == null) {
        node = new Node(word[position], false);
        node_accessor(node);
      }
      var char = node.character;
      if (word[position] < char) {
        self._add(word, position, function(n) { 
                                  return node.left(n); }, frequency);
      } else if (word[position] > char) {
        self._add(word, position, function(n) { 
                                  return node.right(n); }, frequency);
      } else {
        if (position == (word.length - 1)) {
          node.set_word_end();
          /* node.is_word_end = true;*/
          /* use this frequency value to weigh suggestions*/
          node.set_frequency(frequency);
        } else {
          self._add(word, position + 1, 
            function(n) { return node.center(n); }, frequency);
          }
      }
    },

    add: function(word, frequency) {
      /* add a string to the tree */
      if(word == null || word == "")
        return;
      var self = this;
      var node_accessor = function(node) {
        if (node != undefined && node != null)
          self.root = node;
        return self.root;
      };
      self._add(word, 0, node_accessor, frequency);
      self._set_max_frequency(frequency);
      return self;
    },
      
    _all_possible_suffixes: function(node, current_prefix) {
      var self = this;
      if (node == null || node == undefined)
        return [];
      var char = node.character;
      if (current_prefix == undefined || current_prefix == null)
        current_prefix = "";
      var result = [];
      var right_suffixes = [], left_suffixes = [], center_suffixes = [];
      if (node.right() != null) {
        right_suffixes = self._all_possible_suffixes(node.right(), current_prefix);
      }
      if (node.left() != null) {
        left_suffixes = self._all_possible_suffixes(node.left(), current_prefix);
      }
      var new_prefix = current_prefix + node.character;
      if (node.is_word_end) {
        result.push([new_prefix, node.frequency]);
      }
      if (node.center() != null) {
        center_suffixes = self._all_possible_suffixes(node.center(), new_prefix);
      }
      // save from the recursive death
      // decide whether to concat or push
      if(right_suffixes.length) {
        if(typeof right_suffixes[0] === "object") {
          result = result.concat(right_suffixes);
        }
        else {
          result.push(right_suffixes);
        }
      }
      if(left_suffixes.length) {
        if(typeof left_suffixes[0] === "object") {
          result = result.concat(left_suffixes);
        }
        else {
          result.push(left_suffixes);
        }
      }
      if(center_suffixes.length) {
        if(typeof center_suffixes[0] === "object") {
          result = result.concat(center_suffixes);
        }
        else {
          result.push(center_suffixes);
        }
      }
      return result;
    },
      
    search: function(prefix) {
      if(!prefix.length)
        return '';
      var self = this;
      var result = [];
      var word = prefix;
      var last_character_in_word = (word == "") ? 0 : (word.length - 1);
      var node = self.root;
      var position = 0;
      while (node != null) {
        if (word[position] < node.character)
          node = node.left();
        else if (word[position] > node.character)
          node = node.right();
        else {
          if (position == last_character_in_word) { /* end */
            var suffixes = self._all_possible_suffixes(node.center(), prefix);
            if (node.is_word_end)
              suffixes.push([prefix, node.frequency]);
            return suffixes;
          }
          node = node.center();
          position = position + 1;
        }
      }
      return result;
    },

    _set_max_frequency: function(frequency) {
      var self = this;
      if(self.maxFrequency < frequency) {
        self.maxFrequency = frequency;
      }
    }
  };
  return TernaryTree;
}();

var UserPrediction = function() {
  const maxCandidates = 10; // limit number of candidates to consider
  const maxSuggestions = 3; // limit number of suggestions sent
  // the number of last characters of prefix to consider
  const maxDistance = 3;
  const decrementFactor = 0.9 // favour nearbyKeys this much

  var tree = new TernaryTree();
  var suggestions = [];
  var nearbyKeyMap = {};

  // This function is passed an object store of the iDB
  // It fetches all the words and make an unbalanced TST from them
  function createTree(objStore) {
    for(var prop in objStore) {
      if(objStore.hasOwnProperty(prop)) {
        tree.add(prop, objStore[prop]);
      }
    }
  }

  // We no longer bother about balancing the tree since it is only
  // a hundred or so words big at max, and also balancing a TST is
  // a much more cumbersome process than balancing a BST
  // For actual steps involved, see xml2dict.py in dictionaries directory

  function setNearbyKeys(nearbyKeys) {
    //nearbyKeyMap = nearbyKeys;
    // Making a static nearbyKeyMap for QWERTY layout as the process
    // of getting nearbyKeys in sorted order is quite inefficient
    nearbyKeyMap = {"44" : {
                        "120" : 0.24812138728323704,
                        "122" : 0.2506569343065694,
                        "65534" : 0.3114739229024943
                        },
                    "46" : {
                        "109" : 0.24812138728323704,
                        "110" : 0.2506569343065694
                    },
                    "97" : {
                        "113" : 0.24812138728323704,
                        "119" : 0.2506569343065694,
                        "115" : 0.7008163265306124
                    },
                    "98" : {
                        "104" : 0.27375637755102045,
                        "110" : 0.7008163265306124,
                        "118" : 0.7008163265306124
                    },
                    "99" : {
                        "102" : 0.27375637755102045,
                        "118" : 0.7008163265306124,
                        "120" : 0.7008163265306124
                    },
                    "100" : {
                        "120" : 0.27375637755102045,
                        "115" : 0.7008163265306124,
                        "102" : 0.7008163265306124
                    },
                    "101" : {
                        "115" : 0.2506569343065694,
                        "119" : 0.7008163265306124,
                        "114" : 0.7008163265306124
                    },
                    "102" : {
                        "99" : 0.27375637755102045,
                        "100" : 0.7008163265306124,
                        "103" : 0.7008163265306124
                    },
                    "103" : {
                        "118" : 0.27375637755102045,
                        "102" : 0.7008163265306124,
                        "104" : 0.7008163265306124
                    },
                    "104" : {
                        "98" : 0.27375637755102045,
                        "103" : 0.7008163265306124,
                        "106" : 0.7008163265306124
                    },
                    "105" : {
                        "106" : 0.2506569343065694,
                        "111" : 0.7008163265306124,
                        "117" : 0.7008163265306124
                    },
                    "106" : {
                        "110" : 0.27375637755102045,
                        "104" : 0.7008163265306124,
                        "107" : 0.7008163265306124
                    },
                    "107" : {
                        "109" : 0.27375637755102045,
                        "106" : 0.7008163265306124,
                        "108" : 0.7008163265306124
                    },
                    "108" : {
                        "111" : 0.24812138728323704,
                        "112" : 0.2506569343065694,
                        "107" : 0.7008163265306124
                    },
                    "109" : {
                        "46" : 0.24812138728323704,
                        "107" : 0.27375637755102045,
                        "110" : 0.7008163265306124
                    },
                    "110" : {
                        "106" : 0.27375637755102045,
                        "98" : 0.7008163265306124,
                        "109" : 0.7008163265306124
                    },
                    "111" : {
                        "107" : 0.2506569343065694,
                        "105" : 0.7008163265306124,
                        "112" : 0.7008163265306124
                    },
                    "112" : {
                        "105" : 0.1752040816326531,
                        "108" : 0.2506569343065694,
                        "111" : 0.7008163265306124
                    },
                    "113" : {
                        "97" : 0.24812138728323704,
                        "101" : 0.1752040816326531,
                        "119" : 0.7008163265306124
                    },
                    "114" : {
                        "100" : 0.2506569343065694,
                        "101" : 0.7008163265306124,
                        "116" : 0.7008163265306124
                    },
                    "115" : {
                        "122" : 0.27375637755102045,
                        "97" : 0.7008163265306124,
                        "100" : 0.7008163265306124
                    },
                    "116" : {
                        "102" : 0.2506569343065694,
                        "114" : 0.7008163265306124,
                        "121" : 0.7008163265306124
                    },
                    "117" : {
                        "104" : 0.2506569343065694,
                        "105" : 0.7008163265306124,
                        "121" : 0.7008163265306124
                    },
                    "118" : {
                        "103" : 0.27375637755102045,
                        "98" : 0.7008163265306124,
                        "99" : 0.7008163265306124
                    },
                    "119" : {
                        "97" : 0.2506569343065694,
                        "101" : 0.7008163265306124,
                        "113" : 0.7008163265306124
                    },
                    "120" : {
                        "100" : 0.27375637755102045,
                        "99" : 0.7008163265306124,
                        "122" : 0.7008163265306124
                    },
                    "121" : {
                        "103" : 0.2506569343065694,
                        "116" : 0.7008163265306124,
                        "117" : 0.7008163265306124
                    },
                    "122" : {
                        "44" : 0.2506569343065694,
                        "115" : 0.27375637755102045,
                        "120" : 0.7008163265306124
                    }
                   };
    // We can have different nearbyKeyMaps for different keyboard layouts
  }

  // This function will predict words matching the input
  // Given a prefix, we will predict words as follows:
  // 1. give maximum priority to words ending within prefix.length + 3 - TBD
  // 2. consider the frequency of words
  // 
  // For prediction, we will consider maxDistance characters from the end
  // of prefix and see for their weighted combinations using nearbyKeyMap
  // If the user makes even more mistakes (sorry :p), it is better that we
  // add a new word and proceed with it
  //
  function predict(prefix) {
    // Ignore case of the prefix
    var processedPrefix = prefix.toLowerCase();
    // Consider combinations of this string for predictions
    var consider = processedPrefix.substr(-maxDistance);
    var former = processedPrefix.substr(0, prefix.length - maxDistance);
    var count =  maxCandidates;
    
    // If the length of prefix is more than maxDistance, we simply seek exact 
    // matches of the former characters. If not found, return an empty array
    var matchesFormer = [];
    if(former.length) {
      matchesFormer = tree.search(former);
      if(!matchesFormer.length) {
        return [];
      }
    }

    var cases = generatePerms(consider);
    var ignore = "";
    cases.forEach(function(element) {
      // See if this candidate is present
      if(count > 0) {
        // See if we can ignore the search
        if(ignore.lastIndexOf(element[0][0]) === -1) {
          var match = tree.search(former + element[0]);
          if(match.length) {
            suggestions = suggestions.concat(match);
            count -= match.length; 
          }
          else {
            // Since we don't have any suggestions for this permutation
            // we see the character that is causing troubles and cache it
            // We can then simply ignore the searches for those characters
            // This is, however,  only done for the first character in
            // element[0] as keeping track of others will be a disaster
            match = tree.search(former + element[0][0]);
            if(!match.length) {
              ignore += element[0][0];
            }
          }
        }
      }
    });

    // Normalize the frequencies between 0-31
    // Keep a lower bound of 5 for maxFrequency, if it is less than this
    // use 5 as maxFrequency as we don't want to normalize the frequency
    // of newly added words (at the time of dictionary building) to be bumped
    // too much
    // The maxFrequency threshold of just 5 gives weird results, so we 
    // bump it to 8
    var maxFreq = (tree.maxFrequency < 9) ? 8 : tree.maxFrequency;
    var normalizeFactor = 31 / maxFreq;
    suggestions.forEach(function(element) {
      element[1] *= normalizeFactor;
    });

    // Return a copy of suggestions and empty the original
    var temp = suggestions;
    suggestions = [];
    return temp;

    function permutations(key) {
      var perm = [];
      var count = 0,
          currentWeight = 0;
      var keyCode = key.charCodeAt(0);      
      var array = nearbyKeyMap[keyCode];
      for(var prop in array) {
        if(array.hasOwnProperty(prop)) {
          if(array[prop] > currentWeight) {
            perm.unshift([String.fromCharCode(prop), array[prop]]);
          }
          else {
            perm.push([String.fromCharCode(prop), array[prop]]);
          }
        }
      }
      // Now that we have all the permutations, add the original letter to the
      // perm array
      perm.unshift([key, 1]);
      // Also make room for extra typing - TBD, requires data
      // perm.unshift(['', 1]);
      // Consider only first 3 nearbyKeys
      // This will generate the same keys everytime though because nearbyKeyMap
      // is static. A better method may be adopted
      // perm.splice(4); We don't have more than 4 anyway.
      return perm;
    }

    function generatePerms(prefix) {
      if(prefix.length > 3)
        return;
      var perms = [];
      var first = permutations(prefix[0]);
      if(prefix[1]) {
        var second = permutations(prefix[1]);
        if(prefix[2]) {
          var third = permutations(prefix[2]);
          for(var i = 0; i < first.length; i++) {
            for(var j = 0; j < second.length; j++) {
              for(var k = 0; k < third.length; k++) {
                var str = first[i][0] + second[j][0] + third[k][0];
                var freq = first[i][1] * second[j][1] * third[k][1];
                if(str.length === 3){
                  perms.push([str, freq]); 
                }
              }
            }
          }
          return perms;
        }
        for(var j = 0; j < first.length; j++) {
          for(var k = 0; k < second.length; k++) {
            var str = first[j][0] + second[k][0];
            var freq = first[j][1] * second[k][1];
            if(str.length === 2) {
              perms.push([str, freq]);
            }
          }
        }
        return perms;
      }
      return first;
    }
  }

  return {
      setDictionary: createTree,
      setNearbyKeys: setNearbyKeys,
      predict: predict
  };
}();
