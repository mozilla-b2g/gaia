/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var _language; // the current language (e.g. en_US)
var _dict; // the dictionary for the current language
var _prefixLimit; // the maximum length of prefixes (loaded from dictionary)
var _bloomFilterSize; // the size of the bloom filter (loaded from dictionary)
var _bloomFilterMask; // mask for offsets into the bloom filter
var _charMap; // diacritics table (mapping diacritics to the base letter)
var _start; // starting position of the trie in _dict
var _nearbyKeys; // nearby keys for any given key
var _currentWord = ""; // the word currently being edited

// Send a log message to the main thread since we can't output to the console
// directly.
function log(msg) {
  self.postMessage({ cmd: "log", args: [msg] });
}

// Calculate the squared distance of a point (x, y) to the nearest edge of
// a rectangle (left, top, width, height). This is used to calculate the
// nearby keys for every key. We search the dictionary by looking for words
// where each character corresponds to the key the user touched, or a key
// near that key.
function SquaredDistanceToEdge(left, top, width, height, x, y) {
  var right = left + width;
  var bottom = top + height;
  var edgeX = x < left ? left : (x > right ? right : x);
  var edgeY = y < top ? top : (y > bottom ? bottom : y);
  var dx = x - edgeX;
  var dy = y - edgeY;
  return dx * dx + dy * dy;
}

// Determine whether the key is a special character or a regular letter.
// Special characters include backspace (8), return (13), and space (32).
function SpecialKey(key) {
  var code = key.code;
  return code <= 32;
}

function Filter(hash) {
  var offset = hash >> 3;
  var bit = hash & 7;
  return !!(_dict[_start + (offset & _bloomFilterMask)] & (1 << bit));
}

const LookupPrefix = (function () {
    var pos;

    // Markers used to terminate prefix/offset tables.
    const EndOfPrefixesSuffixesFollow = "#".charCodeAt(0);
    const EndOfPrefixesNoSuffixes = "&".charCodeAt(0);

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
        var symbol = getVLU();
        if (symbol == EndOfPrefixesNoSuffixes)
          return result; // No suffixes, done.
        if (symbol == EndOfPrefixesSuffixesFollow) {
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
      var p = prefix.charCodeAt(path.length);
      var last = 0;
      while (true) {
        var symbol = getVLU();
        if (symbol == EndOfPrefixesNoSuffixes ||
            symbol == EndOfPrefixesSuffixesFollow) {
          // No matching branch in the trie, done.
          return;
        }
        var offset = getVLU() + last;
        if (_charMap[symbol] == p) { // Matching prefix, follow the branch in the trie.
          var saved = tell();
          seekTo(offset);
          var path2 = path + String.fromCharCode(symbol);
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

      // Skip over the header bytes, the diacritics table and the bloom filter data.
      pos = _start + _bloomFilterSize;

      SearchPrefix(prefix, "", result);

      return result;
    });
})();

// Generate an array of char codes from a word.
function String2Codes(word) {
  var codes = new Uint8Array(word.length);
  for (var n = 0; n < codes.length; ++n)
    codes[n] = word.charCodeAt(n);
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
function Check(input, prefixes, candidates) {
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
    if (prefixes.has(prefix))
      return;
    prefixes.add(prefix);
    var result = LookupPrefix(prefix);
    if (result) {
      for (var n = 0; n < result.length; ++n)
        candidates.push(result[n]);
    }
  }
}

// Generate all candidates with an edit distance of 1.
function EditDistance1(input, prefixes, candidates) {
  var length = input.length;
  for (var n = 0; n < length; ++n) {
    var original = input[n];
    var nearby = _nearbyKeys[String.fromCharCode(original)];
    for (var i = 0; i < nearby.length; ++i) {
      input[n] = nearby[i].charCodeAt(0);
      Check(input, prefixes, candidates);
    }
    input[n] = original;
  }
}

// Generate all candidates with an edit distance of 2.
function EditDistance2(input, prefixes, candidates) {
  var length = input.length;
  if (length < 4)
    return;
  for (var n = 0; n < length; ++n) {
    for (var m = 1; m < length; ++m) {
      if (n == m)
        continue;
      var original1 = input[n];
      var original2 = input[m];
      var nearby1 = _nearbyKeys[String.fromCharCode(original1)];
      var nearby2 = _nearbyKeys[String.fromCharCode(original2)];
      for (var i = 0; i < nearby1.length; ++i) {
        for (var j = 0; j < nearby2.length; ++j) {
          input[n] = nearby1[i].charCodeAt(0);
          input[m] = nearby2[j].charCodeAt(0);
          Check(input, prefixes, candidates);
        }
      }
      input[n] = original1;
      input[m] = original2;
    }
  }
}

// Generate all candidates with a missing character.
function Omission1Candidates(input, prefixes, candidates) {
  var length = Math.min(input.length, _prefixLimit - 1);
  var input2 = Uint8Array(length + 1);
  for (var n = 1; n <= length; ++n) {
    for (var i = 0; i < n; ++i)
      input2[i] = input[i];
    while (i < length)
      input2[i+1] = input[i++];
    for (var ch in _nearbyKeys) {
      input2[n] = ch.charCodeAt(0);
      Check(input2, prefixes, candidates);
    }
  }
}

// Generate all candidates with a single extra character.
function Deletion1Candidates(input, prefixes, candidates) {
  var length = input.length;
  var input2 = Uint8Array(length - 1);
  for (var n = 1; n < length; ++n) {
    for (var i = 0; i < n; ++i)
      input2[i] = input[i];
    ++i;
    while (i < length)
      input2[i-1] = input[i++];
    Check(input2, prefixes, candidates);
  }
}

const LevenshteinDistance = (function () {
  var matrix = [];

  return function(a, b) {
    var a_length = a.length;
    var b_length = b.length;

    if (!a_length)
      return b_length;
    if (!b_length)
      return a_length;

    // Ensure that the matrix is large enough. We keep the matrix around
    // between computations to avoid excessive garbage collection.
    while (matrix.length <= b_length)
      matrix.push([]);

    // Increment along the first column of each row.
    for (var i = 0; i <= b_length; i++)
      matrix[i][0] = i;

    // increment each column in the first row
    for (var j = 0; j <= a_length; j++)
      matrix[0][j] = j;

    // Fill in the rest of the matrix
    for (i = 1; i <= b_length; i++) {
      for (j = 1; j <= a_length; j++) {
        if (_charMap[b.charCodeAt(i-1)] == _charMap[a.charCodeAt(j-1)]) {
          matrix[i][j] = matrix[i-1][j-1];
        } else {
          matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                  Math.min(matrix[i][j-1] + 1, // insertion
                                           matrix[i-1][j] + 1)); // deletion
        }
      }
    }

    return matrix[b_length][a_length];
  };
})();

// Get the prefix of a word, suitable to be looked up in the bloom filter. We
// cut off any letters after the first _prefixLimit characters, and convert
// upper case to lower case and diacritics to the corresponding base letter.
function GetPrefix(word) {
  var prefix = word.substr(0, _prefixLimit);
  var result = "";
  for (var n = 0; n < prefix.length; ++n)
    result += String.fromCharCode(_charMap[prefix.charCodeAt(n)]);
  return result;
}

function Predict(word) {
  // This is the list where we will collect all the candidate words.
  var candidates = [];
  // Limit search by prefix to avoid long lookup times.
  var prefix = GetPrefix(word);
  // Check for the current input, edit distance 1 and 2 and single letter
  // omission and deletion in the prefix.
  var input = String2Codes(prefix);
  var prefixes = new Set();
  Check(input, prefixes, candidates);
  EditDistance1(input, prefixes, candidates);
  EditDistance2(input, prefixes, candidates);
  Omission1Candidates(input, prefixes, candidates);
  Deletion1Candidates(input, prefixes, candidates);
  // Sort the candidates by Levenshtein distance and frequency.
  for (var n = 0; n < candidates.length; ++n) {
    var candidate = candidates[n];
    var candidate_word = candidate.word;
    var candidate_freq = candidate.freq;
    // Calculate the distance of the word that was entered so far to the
    // same number of letters from the candidate.
    candidate.distance = LevenshteinDistance(word, candidate_word);
  }
  candidates.sort(function (a, b) {
    if (a.distance == b.distance)
      return b.freq - a.freq;
    return a.distance - b.distance;
  });
  return candidates;
}

var PredictiveText = {
  key: function PTW_key(keyCode, keyX, keyY) {
    if (keyCode == 32) {
      self.postMessage({ cmd: "sendCandidates", args: [[]] });
      _currentWord = "";
      return;
    }
    if (keyCode == 8) {
      _currentWord = _currentWord.substr(0, _currentWord.length - 1);
    } else {
      _currentWord += String.fromCharCode(keyCode).toLowerCase();
    }
    var wordList = [];
    if (_currentWord.length > 0) {
      var candidates = Predict(_currentWord);
      for (var n = 0; n < candidates.length; ++n) {
        var word = candidates[n].word;
        wordList.push([word, word]);
      }
    }
    self.postMessage({ cmd: "sendCandidates", args: [ wordList ] });
  },
  select: function PTW_select(textContent, data) {
    if (_currentWord != data) {
      // erase the current input
      var str = _currentWord.replace(/./g, "\x08");
      // send the selected word
      str += data;
      self.postMessage({ cmd: "sendString", args: [str] });
    }
    _currentWord = "";
    self.postMessage({ cmd: "sendCandidates", args: [[]] });
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
      var list = "";
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
  },
  setLanguage: function PTW_setLanguage(language, dict) {
    _language = language;
    _dict = Uint8Array(dict);

    var pos = 0;

    // Read the header.
    _prefixLimit = _dict[pos++];
    _bloomFilterSize = _dict[pos++] * 65536;
    _bloomFilterMask = _bloomFilterSize - 1;

    // Create the character map that maps all valid characters to lower case
    // and removes all diacritics along the way.
    _charMap = {};
    var set = "0123456789abcdefghijklmnopqrstuvwxyz'- ";
    for (var n = 0; n < set.length; ++n) {
      var ch = set[n];
      _charMap[ch.charCodeAt(0)] =
      _charMap[ch.toUpperCase().charCodeAt(0)] = ch.charCodeAt(0);
    }
    // Read the diacritics table.
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
    var baseLetter;
    while ((baseLetter = getVLU()) != 0) {
      var diacritic;
      while ((diacritic = getVLU()) != 0)
        _charMap[diacritic] = baseLetter;
    }

    // Remember the starting offset of the bloom filter.
    _start = pos;

    // Reset the predictor state.
    _currentWord = "";
  }
};

self.onmessage = function(evt) {
  var data = evt.data;
  PredictiveText[data.cmd].apply(PredictiveText, data.args);
}
