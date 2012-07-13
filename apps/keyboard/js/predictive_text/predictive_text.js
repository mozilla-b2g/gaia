/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SuggestionEngine = {};

(function() {

  var debugging = true;
  var TAG = '[PredictiveText] ';

  var debug = function(str) {
    if (!debugging)
      return;

    if (window.dump)
      window.dump(TAG + str + '\n');
    if (console && console.log) {
      console.log(TAG + str);
      if (arguments.length > 1)
        console.log.apply(this, arguments);
    }
  };

  var SimpleProfiler = function(tag) {
    this.startTime = new Date().getTime();
    this.tag = tag || 'Simple Profiling';
  };

  SimpleProfiler.prototype = {
    endProfiling: function() {
      var endTime = new Date().getTime();
      debug('elapse time for ' + this.tag + ' : ' +
             (endTime - this.startTime) + ' ms');
    }
  };

  /* for non-Mozilla browsers */
  if (!KeyEvent) {
    var KeyEvent = {
      DOM_VK_BACK_SPACE: 0x8,
      DOM_VK_RETURN: 0xd,
      DOM_VK_SPACE: 0x20
    };
  }

  var settings;
  //var binDict;
  //var proximityInfo;
  //var keyDetector;
  //


  var SpellChecker = function spellchecker() {

    var currentWord = null;
    var ptWorker;
    var _layoutParams = null;

    this.init = function spellchecker_init(options) {
      debug('init');

      settings = options;

      /* load dictionaries */
      var lang = settings.lang;

      ptWorker = new Worker(settings.path + 'pt_worker.js');
      ptWorker.onmessage = function (evt) {
        if (typeof evt.data == 'string') {
          // for debug message
          debug(evt.data);
        } else {
          console.log('get word list' + evt.data);
          var sendCandidates = function send_can(wordList) {

            if (!wordList || wordList.length == 0) {
              settings.sendCandidates([]);
              return;
            }

            var list = [];
            for (var i in wordList) {
              list.push([wordList[i]]);
            }

            settings.sendCandidates(list);
          };

          sendCandidates(evt.data);
        }
      }

      ptWorker.onerror = function(event){
            throw new Error(event.message + " (" + event.filename + ":" + event.lineno + ")");
      };

      /*
      var sourceDir = "dict/onlinedict.dict";
      var dictOffset = 0;
      var dictSize = 0;
      binDict = new BinaryDictionary(sourceDir, dictOffset, dictSize);
      */

     /*
      var keys = [
        new Key('q', 4,   7, 40, 58),
        new Key('w', 52,  7, 40, 58),
        new Key('e', 97,  7, 40, 58),
        new Key('r', 142, 7, 40, 58),
        new Key('t', 187, 7, 40, 58),
        new Key('y', 232, 7, 40, 58),
        new Key('u', 277, 7, 40, 58),
        new Key('i', 322, 7, 40, 58),
        new Key('o', 367, 7, 40, 58),
        new Key('p', 412, 7, 40, 58),

        new Key('a', 4,   70, 40, 58),
        new Key('s', 52,  70, 40, 58),
        new Key('d', 97,  70, 40, 58),
        new Key('f', 142, 70, 40, 58),
        new Key('g', 187, 70, 40, 58),
        new Key('h', 232, 70, 40, 58),
        new Key('j', 277, 70, 40, 58),
        new Key('k', 322, 70, 40, 58),
        new Key('l', 367, 70, 40, 58),

        new Key('z', 4,   133, 40, 58),
        new Key('x', 52,  133, 40, 58),
        new Key('c', 97,  133, 40, 58),
        new Key('v', 142, 133, 40, 58),
        new Key('b', 187, 133, 40, 58),
        new Key('n', 232, 133, 40, 58),
        new Key('m', 277, 133, 40, 58)
      ];
      */

     /*
      var keyboardWidth = 480;
      var keyboardHeight = 220; // orig: 300
      var gridWidth = 32;
      var gridHeight = 16;
      */

      //proximityInfo = new ProximityInfo(gridWidth, gridHeight, keyboardWidth, keyboardHeight, 70, 97, keys, null);
      //keyDetector = new KeyDetector(keys);

      ptWorker.postMessage( {
        action: 'init'//,
        //proximityInfo: promityInfo,
        //keys: keys
      });

    };

    var empty = function spellchecker_empty() {
      debug('Empty');
      currentWord.reset();
    };

    this.empty = empty;

    var doSpellCheck = function() {

      if (currentWord.size() < 1) {
        settings.sendCandidates([]);
        return;
      }

      var sendCandidates = function send_can(wordList) {

        if (!wordList || wordList.length == 0) {
          settings.sendCandidates([]);
          return;
        }

        var list = [];
        for (var i in wordList) {
          list.push([wordList[i]]);
        }

        settings.sendCandidates(list);
      };

      var callback = {};
      callback.addWords = function (wordList, scores) {
          sendCandidates(wordList);
      }

      ptWorker.postMessage({
        currentWord: currentWord
      });

    };

    this.click = function spellchecker_click(keyCode, wordComposer) {

      switch (keyCode) {
        case KeyEvent.DOM_VK_RETURN:
        case KeyEvent.DOM_VK_SPACE:
          empty();
          settings.sendCandidates([]);
          break;
        case KeyEvent.DOM_VK_BACK_SPACE:
          currentWord.deleteLast();
          doSpellCheck();
          break;
        default:
          currentWord = wordComposer;
          if (currentWord.size() < 1) {
            debug('Invalid input for suggestion');
            return;
          }

          doSpellCheck();
          break;
      }
    };

    this.select = function(text, type) {
      var i = currentWord.size();
      while (i--) {
        settings.sendKey(KeyEvent.DOM_VK_BACK_SPACE);
      }

      settings.sendString(text + ' ');
      empty();
      settings.sendCandidates([]);
    };

    this.setLayoutParams = function(layoutParams) {
      debug('setLayoutParams');
      _layoutParams = layoutParams;

      ptWorker.postMessage({
        action: "setLayoutParams",
        layoutParams: _layoutParams
      });
    };

  };

  var insertArray = function insertArray(array, element, limit) {


    for (var j = 0; j < Math.min(limit, array.length); j++) {
      if (array[j].value < element.value) {

        if (j + 1 == limit)
          array.splice(j, 1, element);
        else
          array.splice(j, 0, element);

        break;
      }
    }

    // just insert the element when the length < limit (and the case length = 0)
    if (j == array.length && array.length < limit) {
      array.push(element);
      return;
    }

    if (array.length > limit)
      var c = array.pop();

  };

var typedLetterMultiplier = 2;
var fullWordMultiplier = 2;
var maxWords = 18;
var maxAlternatives = 8;

function array_fill(array, value) {

  var length = array.length; 
  for (var i = 0; i < length; i++) {
    array[i] = value;
  }

}

function array_copy(array1, start1, array2, start2, count) {

  for (var i = start1, j = start2, n = 0; n < count; i++, j++, n++) {
    array2[j] = array1[i];
  }
}


  var KeyDetector = function(keys) {

    this.keys = keys;
    // working area
    this._distances = new Int32Array(KeyDetector.MAX_NEARBY_KEYS);
    this._indices = new Int32Array(KeyDetector.MAX_NEARBY_KEYS);
  }

  KeyDetector.MAX_NEARBY_KEYS = 12;

  KeyDetector.prototype = {

    getKeyIndexAndNearbyCodes: function kd_getKeyIndexAndNearbyCodes(x, y, allCodes) {
      var allKeys = this.keys;

      //final int touchX = getTouchX(x);
      //final int touchY = getTouchY(y);

      this.initializeNearbyKeys();
      var primaryIndex = -1;
      var proximityCorrectOn = true;
      var proximityThresholdSquare = 32 * 32;

      var nearestKeys = proximityInfo.getNearestKeys(x, y);
      for (var i = 0; i < nearestKeys.length; i++) {
        var index = nearestKeys[i];
        var key = allKeys[index];
        var isOnKey = key.isOnKey(x, y);
        var distance = key.squaredDistanceToEdge(x, y);

        if (isOnKey || (proximityCorrectOn && distance < proximityThresholdSquare)) {
          var insertedPosition = this.sortNearbyKeys(index, distance, isOnKey);
          if (insertedPosition == 0 && isOnKey)
            primaryIndex = index;
        }
      }

      if (allCodes != null && allCodes.length > 0) {
        this.getNearbyKeyCodes(allCodes);
      }

      return primaryIndex;
    },

    initializeNearbyKeys: function kd_initializeNearbyKeys() {
      var INT_MAX = Math.pow(2, 31) - 1;
      array_fill(this._distances, INT_MAX);
      array_fill(this._indices, -1);
    },

    getNearbyKeyCodes: function kd_getNearbyKeyCodes(allCodes) {
      var allKeys = this.keys;
      var indices = this._indices;

      // allCodes[0] should always have the key code even if it is a non-letter key.
      if (indices[0] == -1) {
        allCodes[0] = -1;
        return;
      }

      var numCodes = 0;
      for (var j = 0; j < indices.length && numCodes < allCodes.length; j++) {
        var index = indices[j];
        if (index == -1)
          break;

        var code = allKeys[index].code;
        // filter out a non-letter key from nearby keys
        //if (code < ' ')
        //  continue;

        allCodes[numCodes++] = code.charCodeAt(0);
      }
    },

    sortNearbyKeys: function kd_sortNearbyKeys(keyIndex, distance, isOnKey) {
      var distances = this._distances;
      var indices = this._indices;

      for (var insertPos = 0; insertPos < distances.length; insertPos++) {
        var comparingDistance = distances[insertPos];

        if (distance < comparingDistance || (distance == comparingDistance && isOnKey)) {
          var nextPos = insertPos + 1;
          if (nextPos < distances.length) {

            var tempDistances = new Int32Array(distances);
            array_copy(tempDistances, insertPos, distances, nextPos,
              distances.length - nextPos);

            var tempIndices = new Int32Array(indices);
            array_copy(tempIndices, insertPos, indices, nextPos,
              indices.length - nextPos);
          }

          distances[insertPos] = distance;
          indices[insertPos] = keyIndex;
          return insertPos;
        }
      }

      return distances.length;
    }
    
  }

  var Key = function(code, x, y, width, height) {
    this.code = code;
    //this.label = label;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  Key.prototype = {
    isSpacer: function key_isSpacer() {
      return (this.code == ' ');
    },

    squaredDistanceToEdge: function key_squaredDistanceToEdge(x, y) {
      var left = this.x;
      var right = left + this.width;

      var top = this.y;
      var bottom = top + this.height;

      var edgeX = x < left ? left : (x > right ? right : x);
      var edgeY = y < top ? top : (y > bottom ? bottom : y);
      var dx = x - edgeX;
      var dy = y - edgeY;
      return dx * dx + dy * dy;
    },

    isOnKey: function key_isOnKey(x, y) {
      return (x >= this.x && x <= this.x + this.width) &&
             (y >= this.y && y <= this.y + this.height) 
    }
  }

  var ProximityInfo = function ProximityInfo (gridWidth, gridHeight, minWidth, height, 
    keyWidth, keyHeight, keys, touchPositionCorrection) {

    this._gridWidth = gridWidth;
    this._gridHeight = gridHeight;
    this._gridSize = this._gridWidth * this._gridHeight;
    this._cellWidth = Math.ceil(minWidth / this._gridWidth);
    this._cellHeight = Math.ceil(height  / this._gridHeight);
    this._keyboardMinWidth = minWidth;
    this._keyboardHeight = height;
    this._keyHeight = keyHeight;

    this._gridNeighbors = []; // mGridNeighbors = new int[mGridSize][]; 

    if (minWidth == 0 || height == 0) {
      // No proximity required. Keyboard might be mini keyboard.
      return;
    }

    this.computeNearestNeighbors(keyWidth, keys, touchPositionCorrection);

  };

  ProximityInfo.MAX_PROXIMITY_CHARS_SIZE = 16;
  ProximityInfo.SEARCH_DISTANCE = 1.2;
  
  ProximityInfo.prototype = {

    computeNearestNeighbors: function binDict_computeNearestNeighbors(defaultWidth, keys, touchPositionCorrection) {
      var thresholdBase = Math.floor(defaultWidth * ProximityInfo.SEARCH_DISTANCE);
      var threshold = thresholdBase * thresholdBase;

      var indices = new Int32Array(keys.length);
      var gridWidth  = this._gridWidth * this._cellWidth;
      var gridHeight = this._gridHeight * this._cellHeight;

      for (var x = 0; x < gridWidth; x += this._cellWidth) {
        for (var y = 0; y < gridHeight; y += this._cellHeight) {
          var centerX = x + this._cellWidth / 2;
          var centerY = y + this._cellHeight / 2;

          var count = 0;
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];

            if (key.isSpacer()) 
              continue;

            if (key.squaredDistanceToEdge(centerX, centerY) < threshold)
              indices[count++] = i;
          }

          var cell = new Int32Array(count);
          array_copy(indices, 0, cell, 0, count);

          this._gridNeighbors[(y / this._cellHeight) * this._gridWidth + (x / this._cellWidth)] = cell;
        }
      }

      this.setProximityInfo(this._gridNeighbors, this._keyboardMinWidth, this._keyboardHeight, 
        keys, touchPositionCorrection);
    },

    setProximityInfo: function pi_setProximityInfo(gridNeighborKeyIndices, keyboardWidth, keyboardHeight, keys, touchPositionCorrection) {
      var proximityCharsArray = new Int32Array(this._gridSize * ProximityInfo.MAX_PROXIMITY_CHARS_SIZE);
      array_fill(proximityCharsArray, -1); // should be KeyDetector.NOT_A_CODE

      for (var i = 0; i < this._gridSize; ++i) {
        var proximityCharsLength = gridNeighborKeyIndices[i].length;

        for (var j = 0; j < proximityCharsLength; ++j) {

          if (keys[gridNeighborKeyIndices[i][j]]) {
            proximityCharsArray[i * ProximityInfo.MAX_PROXIMITY_CHARS_SIZE + j] = 
              keys[gridNeighborKeyIndices[i][j]].code.charCodeAt(0);
          } else {
            console.error('error');
          }

        }
      }

      var keyCount = keys.length;

      var keyXCoordinates = new Int32Array(keyCount);
      var keyYCoordinates = new Int32Array(keyCount);
      var keyWidths = new Int32Array(keyCount);
      var keyHeights = new Int32Array(keyCount);

      var keyCharCodes = new Int32Array(keyCount);
      for (var i = 0; i < keyCount; ++i) {
        var key = keys[i];
        keyXCoordinates[i] = key.x;
        keyYCoordinates[i] = key.y;
        keyWidths[i] = key.width;
        keyHeights[i] = key.height;
        keyCharCodes[i] = key.code.charCodeAt(0);
      }

      // TODO: no touch correction for now
      /*
      if (touchPositionCorrection != null && touchPositionCorrection.isValid()) {
            sweetSpotCenterXs = new float[keyCount];
            sweetSpotCenterYs = new float[keyCount];
            sweetSpotRadii = new float[keyCount];
            calculateSweetSpot(keys, touchPositionCorrection,
                    sweetSpotCenterXs, sweetSpotCenterYs, sweetSpotRadii);
      }
      */
      var sweetSpotCenterXs = [];
      var sweetSpotCenterYs = [];
      var sweetSpotRadii = [];

      this._nativeProximityInfo = emScriptenCreateProximityInfo(ProximityInfo.MAX_PROXIMITY_CHARS_SIZE,
        keyboardWidth, keyboardHeight, this._gridWidth, this._gridHeight, proximityCharsArray,
        keyCount, keyXCoordinates, keyYCoordinates, keyWidths, keyHeights, keyCharCodes,
        sweetSpotCenterXs, sweetSpotCenterYs, sweetSpotRadii);
    },

    getNearestKeys: function pi_getNearestKeys(x, y) {
      if (this._gridNeighbors == null) {
        return [];
      }

      if (x >= 0 && x < this._keyboardMinWidth && y >= 0 && y < this._keyboardHeight) {
        var index = Math.floor(y /  this._cellHeight) * this._gridWidth + Math.floor(x / this._cellWidth);
        if (index < this._gridSize) {
          return this._gridNeighbors[index];
        }
      }

      return [];
    }

  };

  /*
  var BinaryDictionary = function BinaryDictionary (filename, offset, length) {

    this._inputCodes = new Int32Array(this.MAX_WORD_LENGTH * 
      this.MAX_PROXIMITY_CHARS_SIZE);

    this._outputChars = new Int32Array(1024);
    this._scores = new Int32Array(1024);

    this.loadDictionary(filename, offset, length);

  };


  BinaryDictionary.MAX_WORD_LENGTH = 48;

  BinaryDictionary.prototype = {
    // const definitions
    MAX_WORD_LENGTH: 48, 
    MAX_PROXIMITY_CHARS_SIZE:  ProximityInfo.MAX_PROXIMITY_CHARS_SIZE,
    MAX_WORDS: 10,
    //MAX_BIGRAMS: 60,
    TYPED_LETTER_MULTIPLIER: 2,
    FULL_WORD_SCORE_MULTIPLIER:  2,   // In Dictionary class

    // void loadDictionary(String path, long startOffset, long length)
    loadDictionary: function binDict_loadDictionary(path, startOffset, length) {
      this._nativeDict = emScriptenCreateDictionary(path, startOffset, length,
        this.TYPED_LETTER_MULTIPLIER, this.FULL_WORD_SCORE_MULTIPLIER,
        this.MAX_WORD_LENGTH, this.MAX_WORDS, this.MAX_PROXIMITY_CHARS_SIZE);
    },


    getWords: function binDict_getWords(codes, callback, proximityInfo) {
      var count = this.getSuggestions(codes, proximityInfo, this._outputChars, this._scores);


      var wordList = [];

      for (var j = 0; j < count; j++) {
        if (this._scores[j] < 1)
          break;

        var start = j * this.MAX_WORD_LENGTH;
        var len = 0;

        while(len < this.MAX_WORD_LENGTH && this._outputChars[start + len] != 0) {
          ++len;
        }

        if (len > 0) {
          var word = '';
          var character;
          for (var i = 0; i < len; i++) {
            character = this._outputChars[start + i];
            word += String.fromCharCode(character);
          }
        }

        wordList.push(word);

      }

      callback.addWords(wordList, this._scores); // no dicTypeId && DataType

    },

    getSuggestions: function binDict_getSuggestions(codes, proximityInfo, outputChars, scores) {
      if (!this.isValidDictionary())
        return -1;

      var codesSize = codes.size();

      // Won't deal with really long words.
      if (codesSize > this.MAX_WORD_LENGTH - 1)
        return -1;

      var flags = 0;
      array_fill(this._inputCodes, -1);  // -1 should be wordComposer.NOT_A_CODE

      for (var i = 0; i < codesSize; i++) {

        var alternatives = codes._codes[i];

        if (!alternatives) {
          console.error('alternatives undefined/null');
          return;
        }


        array_copy(alternatives, 0, this._inputCodes, i * this.MAX_PROXIMITY_CHARS_SIZE, 
                   Math.min(alternatives.length, this.MAX_PROXIMITY_CHARS_SIZE));

        //this._inputCodes[i * this.MAX_PROXIMITY_CHARS_SIZE] = codes.charCodeAt(i);
      }

      array_fill(outputChars, 0);
      array_fill(scores, 0);

      var start = new Date().getTime();
      var suggestions =
      emScriptenGetSuggestions(this._nativeDict, proximityInfo._nativeProximityInfo, codes._xCoordinates,
        codes._yCoordinates, this._inputCodes, codesSize,
        flags, outputChars, scores); 


      var elapsed = new Date().getTime() - start;
      console.log(codes._typedWord + 'suggestion cost: ' + elapsed + ' ms');

      return suggestions;
    },

    isValidDictionary: function binDict_isValidDictionary() {
      return this._nativeDict != 0;
    }

  };
  */

  var WordComposer = function WordComposer() {
    var N = 48;
    this._codes = [];
    this._typedWord = '';
    this._xCoordinates = new Int32Array(N);
    this._yCoordinates = new Int32Array(N);
  };

  WordComposer.prototype = {
    add: function (primaryCode, codes, x, y) {
      var newIndex = this.size();
      this._typedWord += String.fromCharCode(primaryCode);

      //correctPrimaryJuxtapos(primaryCode, codes);

      this._codes.push(codes);
      if (newIndex < 48) {
        this._xCoordinates[newIndex] = x;
        this._yCoordinates[newIndex] = y;
      }

    },

    reset: function() {
      this._codes.length = 0;
      this._typedWord.length = 0;
      //mCapsCount = 0;
      //mIsFirstCharCapitalized = false;
    },

    size: function() {
      return this._typedWord.length;
    },

    deleteLast: function() {
      var size = this.size();
      if (size > 0) {
        var lastPos = size - 1;
        var lastChar = this._typedWord[lastPos];
        this._codes.pop();

        this._typedWord = this._typedWord.substring(0, lastPos);

        //if (Character.isUpperCase(lastChar)) mCapsCount--;
      }

      /*
      if (size() == 0) {
        mIsFirstCharCapitalized = false;
      }
      */

    }
  };

  var predictiveTextWrapper = new SpellChecker();
  SuggestionEngine = predictiveTextWrapper;

  // Expose typo-js wrapper as an AMD module
  if (typeof define === 'function' && define.amd)
    define('PredictiveText', [], function() { return typoJSWrapper; });

  // Expose to IMEController if we are in Gaia homescreen
  if (typeof IMEManager !== 'undefined') {
    IMEController.SuggestionEngines['predictive_text'] = predictiveTextWrapper;
  }
})();
