/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var _lang; // the current language (e.g. en_us)
var _dict; // the dictionary for the current language
var _prefixLimit; // the maximum length of prefixes (loaded from dictionary)
var _bloomFilterSize; // the size of the bloom filter (loaded from dictionary)
var _bloomFilterMask; // mask for offsets into the bloom filter
var _nearbyKeys; // nearby keys for any given key
var _currentWord = ""; // the word currently being edited

// map special characters (umlaut, etc) to regular characters
const _charMap = {
  "é": "e"
};

function log(msg) {
  self.postMessage({ cmd: 'log', args: [msg] });
}

function SquaredDistanceToEdge(left, top, width, height, x, y) {
  var right = left + width;
  var bottom = top + height;
  var edgeX = x < left ? left : (x > right ? right : x);
  var edgeY = y < top ? top : (y > bottom ? bottom : y);
  var dx = x - edgeX;
  var dy = y - edgeY;
  return dx * dx + dy * dy;
}

function SpecialKey(key) {
  var code = key.code;
  return code <= 32;
}

function Filter(hash) {
  var offset = hash >> 3;
  var bit = hash & 7;
  return !!(_dict[2 + (offset & _bloomFilterMask)] & (1 << bit));
}

const LookupPrefix = (function () {
    var pos;

    // Markers used to terminate prefix/offset tables.
    const EndOfPrefixesSuffixesFollow = '#';
    const EndOfPrefixesNoSuffixes = '&';

    // Read an unsigned byte.
    function getByte() {
      return _dict[pos++];
    }

    // Read a variable length unsigned integer.
    function getVLU() {
        var u = 0
        var shift = 0;
        do {
          var b = _dict[pos++];
          u |= (b & 0x7f) << shift;
          shift += 7;
        } while (b & 0x80);
        return u;
    }

    // Read a 0-terminated string.
    function getString() {
      var s = "";
      var u;
      while ((u = getVLU()) != 0)
        s += String.fromCharCode(u);
      return s;
    }

    // Return the current position.
    function tell() {
      return pos;
    }

    // Seek to a byte position in the stream.
    function seekTo(newpos) {
      pos = newpos;
    }

    // Skip over the prefix/offset pairs and find the list of suffixes and add
    // them to the result set.
    function AddSuffixes(prefix, result) {
      while (true) {
        var ch = String.fromCharCode(getVLU());
        if (ch == EndOfPrefixesNoSuffixes)
          return result; // No suffixes, done.
        if (ch == EndOfPrefixesSuffixesFollow) {
          var freq;
          while ((freq = getByte()) != 0) {
            var word = prefix + getString();
            result.push({word: word, freq: freq});
          }
          return; // Done.
        }
        getVLU(); // ignore offset
      }
    }

    // Search matching trie branches at the current position (pos) for the next
    // character in the prefix. Keep track of the actual prefix path taken
    // in path, since we collapse certain characters in to bloom filter
    // (e.g. upper case/lower case). If found, follow the next prefix character
    // if we have not reached the end of the prefix yet, otherwise add the
    // suffixes to the result set.
    function SearchPrefix(prefix, path, result) {
      var p = prefix[path.length].toLowerCase();
      var last = 0;
      while (true) {
        var ch = String.fromCharCode(getVLU());
        if (ch == EndOfPrefixesNoSuffixes ||
            ch == EndOfPrefixesSuffixesFollow) {
          // No matching branch in the trie, done.
          return;
        }
        var offset = getVLU() + last;
        if (ch.toLowerCase() == p) { // Matching prefix, follow the branch in the trie.
          var saved = tell();
          seekTo(offset);
          var path2 = path + ch;
          if (path2.length == prefix.length)
            AddSuffixes(path2, result);
          else
            SearchPrefix(prefix, path2, result);
          seekTo(saved);
        }
        last = offset;
      }
    }

    return (function (prefix) {
      var result = [];

      // Skip over the header bytes and the bloom filter data.
      pos = 2 + _bloomFilterSize;

      SearchPrefix(prefix, "", result);

      return result;
    });
})();

// Turn a character into a key: turn upper case into lower case
// and convert all umlauts into the base character.
function ToKey(ch) {
  ch = ch.toLowerCase();
  var ch2 = _charMap[ch];
  return (ch2 ? ch2 : ch).charCodeAt(0);
}

// Generate an array of char codes from a word.
function String2Codes(word) {
  var codes = new Uint8Array(word.length);
  for (var n = 0; n < codes.length; ++n)
    codes[n] = ToKey(word[n]);
  return codes;
}

// Convert an array of char codes back into a string.
function Codes2String(codes) {
  var s = "";
  for (var n = 0; n < codes.length; ++n)
    s += String.fromCharCode(codes[n]);
  return s;
}

// Check a candidate word given as an array of char codes against the bloom
// filter and if there is a match, confirm it with the prefix trie.
function Check(input, candidates) {
  log("Check: " + Codes2String(input));
  var h1 = 0;
  var h2 = 0xdeadbeef;
  for (var n = 0; n < input.length; ++n) {
    var ch = input[n];
    h1 = h1 * 33 + ch;
    h1 = h1 & 0xffffffff;
    h2 = h2 * 73 ^ ch;
    h2 = h2 & 0xffffffff;
  }
  if (Filter(h1) && Filter(h2)) {
    var prefix = Codes2String(input);
    var result = LookupPrefix(prefix);
    if (result) {
      for (var n = 0; n < result.length; ++n)
        candidates.push(result[n]);
    }
  }
}

// Generate all candidates with an edit distance of 1.
function EditDistance1(input, candidates) {
  var length = input.length;
  for (var n = 0; n < length; ++n) {
    var key = input[n];
    var nearby = _nearbyKeys[String.fromCharCode(key)];
    for (var i = 0; i < nearby.length; ++i) {
      input[n] = nearby[i].charCodeAt(0);
      Check(input, candidates);
    }
    input[n] = key;
  }
}

// Generate all candidates with an edit distance of 2.
function EditDistance2(input, candidates) {
  var length = input.length;
  if (length < 4)
    return;
  for (var n = 0; n < length; ++n) {
    for (var m = 1; m < length; ++m) {
      if (n == m)
        continue;
      var key1 = input[n];
      var key2 = input[m];
      var nearby1 = _nearbyKeys[String.fromCharCode(key1)];
      var nearby2 = _nearbyKeys[String.fromCharCode(key2)];
      for (var i = 0; i < nearby1.length; ++i) {
        for (var j = 0; j < nearby2.length; ++j) {
          input[n] = nearby1[i].charCodeAt(0);
          input[m] = nearby2[j].charCodeAt(0);
          Check(input, candidates);
        }
      }
      input[n] = key1;
      input[m] = key2;
    }
  }
}

// Generate all candidates with a missing character.
function Omission1Candidates(input, candidates) {
  var length = Math.min(input.length, _prefixLimit - 1);
  var input2 = Uint8Array(length + 1);
  for (var n = 1; n <= length; ++n) {
    for (var i = 0; i < n; ++i)
      input2[i] = input[i];
    while (i < length)
      input2[i+1] = input[i++];
    for (var ch in _nearbyKeys) {
      input2[n] = ch.charCodeAt(0);
      Check(input2, candidates);
    }
  }
}

// Generate all candidates with a single extra character.
function Deletion1Candidates(input, candidates) {
  var length = input.length;
  var input2 = Uint8Array(length - 1);
  for (var n = 1; n < length; ++n) {
    for (var i = 0; i < n; ++i)
      input2[i] = input[i];
    ++i;
    while (i < length)
      input2[i-1] = input[i++];
    Check(input2, candidates);
  }
}

const LevenshteinDistance = (function () {
  var matrix = [];

  return function(a, b) {
    if (a.length == 0) return b.length;
    if (b.length == 0) return a.length;

    // increment along the first column of each row
    for (var i = 0; i <= b.length; i++)
      matrix[i] = [i];

    // increment each column in the first row
    for (var j = 0; j <= a.length; j++)
      matrix[0][j] = j;

    // Fill in the rest of the matrix
    for (i = 1; i <= b.length; i++){
      for (j = 1; j <= a.length; j++){
        if (b.charAt(i-1) == a.charAt(j-1)) {
          matrix[i][j] = matrix[i-1][j-1];
        } else {
          matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                  Math.min(matrix[i][j-1] + 1, // insertion
                                           matrix[i-1][j] + 1)); // deletion
        }
      }
    }

    return matrix[b.length][a.length];
  };
})();

function Predict(word) {
  // This is the list where we will collect all the candidate words.
  var candidates = [];
  // Limit search by prefix to avoid long lookup times.
  var prefix = word.substr(0, _prefixLimit);
  // Check for the current input, edit distance 1 and 2 and single letter
  // omission and deletion in the prefix.
  var input = String2Codes(prefix);
  Check(input, candidates);
  EditDistance1(input, candidates);
  EditDistance2(input, candidates);
  Omission1Candidates(input, candidates);
  Deletion1Candidates(input, candidates);
  // Sort the candidates by Levenshtein distance and frequency.
  for (var n = 0; n < candidates.length; ++n) {
    var candidate = candidates[n];
    var candidate_word = candidate.word;
    var candidate_freq = candidate.freq;
    // Calculate the distance of the word that was entered so far to the
    // same number of letters from the candidate.
    candidate.distance = LevenshteinDistance(word, candidate_word.substr(0, word.length));
  }
  candidates.sort(function (a, b) {
    if (a.distance == b.distance)
      return a.frequency - b.frequency;
    return a.distance - b.distance;
  });
  return candidates;
}

var PredictiveText = {
  init: function PTW_init(lang, dict) {
    _lang = lang;
    _dict = Uint8Array(dict);
    _prefixLimit = _dict[0];
    _bloomFilterSize = _dict[1] * 65536;
    _bloomFilterMask = _bloomFilterSize - 1;
    _currentWord = "";
  },
  key: function PTW_key(keyCode, keyX, keyY) {
    if (keyCode == 32) {
      self.postMessage({ cmd: 'sendCandidates', args: [] });
      _currentWord = "";
      return;
    }
    _currentWord += String.fromCharCode(keyCode).toLowerCase();
    log("currentWord: " + _currentWord);
    var candidates = Predict(_currentWord);
    log(candidates);
    if (candidates.length > 0) {
      var word = candidates[0].word;
      var wordList = [[word, word]];
      self.postMessage({ cmd: 'sendCandidates', args: [ wordList ] });
    }
    log("done");
  },
  select: function PTW_select(textContent, data) {
    log("select");
  },
  setLayoutParams: function PTW_setLayoutParams(params) {
    // For each key, calculate the keys nearby.
    var keyWidth = params.keyWidth;
    var keyHeight = params.keyHeight;
    var threshold = Math.min(keyWidth, keyHeight) * 1.2;
    var keyArray = params.keyArray;
    _nearbyKeys = [];
    threshold *= threshold;
    for (var n = 0; n < keyArray.length; ++n) {
      var key1 = keyArray[n];
      if (SpecialKey(key1))
        continue;
      var list = '';
      for (var m = 0; m < keyArray.length; ++m) {
        var key2 = keyArray[m];
        if (SpecialKey(key2))
          continue;
        if (SquaredDistanceToEdge(key1.x, key1.y, key1.width, key1.height, // key dimensions
                                  key2.x + key2.width/2, key2.y + key2.height/2) // center of candidate key
            < threshold) {
          list += String.fromCharCode(key2.code).toLowerCase();
        }
      }
      _nearbyKeys[String.fromCharCode(key1.code).toLowerCase()] = list;
    }
  }
};

self.onmessage = function(evt) {
  var data = evt.data;
  PredictiveText[data.cmd].apply(PredictiveText, data.args);
}
