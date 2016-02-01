'use strict';

/* global BopomofoEncoder, DataLoader, JSZhuyinDataPackStorage, CacheStore */

/**
 * A queue to run one action at a time.
 * @this   {object}   ActionQueue instance.
 */
var ActionQueue = function ActionQueue() {
  this.pendingActions = [];
  this.waiting = false;
};
/**
 * Function to call to run each action.
 * @type {function}
 */
ActionQueue.prototype.handle = null;
/**
 * Queue and action. The arguments will be kept.
 * @this   {object}   ActionQueue instance.
 */
ActionQueue.prototype.queue = function aq_queue(type, data, reqId) {
  if (this.waiting) {
    this.pendingActions.push([type, data, reqId]);
    return;
  }

  this.waiting = true;
  this.handle(type, data, reqId);
};
/**
 * handle() are suppose to call done() when it finishes.
 * @this   {object}   ActionQueue instance.
 */
ActionQueue.prototype.done = function aq_done() {
  if (!this.waiting) {
    throw 'Calling queue.done() when we are not waiting.';
  }

  var args = this.pendingActions.shift();
  if (!args) {
    this.waiting = false;
    return;
  }

  this.handle.apply(this, args);
};

var JSZhuyinCandidateMetadata = function() {
  this.dataMap = new Map();
  // Start with a number other than any obvious ones to remove the meaning of
  // this incremental ID.
  this.nextId = 42;
  this.NULL_DATA = [0, 0];
};
JSZhuyinCandidateMetadata.prototype.NULL_ID = 0;
JSZhuyinCandidateMetadata.prototype.saveData =
function jcm_saveData(encodedSoundsLength, index) {
  this.dataMap.set(this.nextId, [ encodedSoundsLength, index ]);
  return this.nextId++;
};
JSZhuyinCandidateMetadata.prototype.getData = function(id) {
  if (id === this.NULL_ID) {
    return this.NULL_DATA;
  }
  var data = this.dataMap.get(id);
  if (!data) {
    throw new Error('JSZhuyinCandidateMetadata: ' +
      'Inexistent or outdated candidate.');
  }
  return data;
};
JSZhuyinCandidateMetadata.prototype.clear = function() {
  this.dataMap.clear();
};
var JSZhuyinQueryData = function(symbols, longestPhraseLength) {
  this.symbols = symbols;
  this.expendedEncodedSounds = BopomofoEncoder.encodeExpended(this.symbols);

  this.longestPhraseLength = longestPhraseLength;

  this._trimmedSymbols = undefined;
  this._trimmedSymbolsCombinations = undefined;
};
JSZhuyinQueryData.prototype.getTrimmedSymbols = function() {
  if (this._trimmedSymbols) {
    return this._trimmedSymbols;
  }

  return (this._trimmedSymbols =
    BopomofoEncoder.trimToLength(this.symbols, this.longestPhraseLength));
};
JSZhuyinQueryData.prototype.getTrimmedSymbolsCombinations = function() {
  if (this._trimmedSymbolsCombinations) {
    return this._trimmedSymbolsCombinations;
  }

  return (this._trimmedSymbolsCombinations =
    BopomofoEncoder.getSymbolCombinations(this.getTrimmedSymbols()));
};
var JSZhuyinComposedCandidatesBuilder =
function JSZhuyinComposedCandidatesBuilder() {
  this.cache = null;
};

JSZhuyinComposedCandidatesBuilder.prototype.LONGEST_PHRASE_LENGTH = undefined;

JSZhuyinComposedCandidatesBuilder.prototype.load = function(storage) {
  this.storage = storage;

  this.cache = new CacheStore();
};
JSZhuyinComposedCandidatesBuilder.prototype.unload = function() {
  this.cache = null;
  this.storage = null;
};
JSZhuyinComposedCandidatesBuilder.prototype.addToCache =
function(expendedEncodedSounds, data) {
  this.cache.add(expendedEncodedSounds, data);

  return data;
};
JSZhuyinComposedCandidatesBuilder.prototype.cleanupCache =
function(supersetCodes) {
  this.cache.cleanup(supersetCodes);
};
JSZhuyinComposedCandidatesBuilder.prototype.getComposedCandidates =
function(queryData) {
  var expendedEncodedSounds = queryData.expendedEncodedSounds;

  // The optimization here is based on the fact that the newly appended symbols
  // always forms compositions beginning with the previous results.
  // Remaining compositions with lower scores cannot possibly results
  // in higher score so it does not make sense to calculate them all and
  // rank them for every new symbols. Rather, it make more sense to cache the
  // results and only create possible compositions and results from them and
  // rank them.

  // The |previousFirstResults| array contains JSZhuyinCachedResult instances
  // from the cache, or, if the sliced expended encoded sounds has not be
  // calculated, we would calculate it here and put it into the cache.
  //
  // The final result will be the matched first composed result of the
  // unsliced expended encoded sound.
  //
  // Note that the result data of the final result and in the cache are both
  // calculated with |_getFirstComposedResult()|.
  var previousFirstResults = [ undefined ];
  var lastComposedResultData;
  var i = 0;
  var n = expendedEncodedSounds.length;
  var slicedExpendedEncodedSounds;
  // This loop will ensure previousFirstResults is populated with
  // results from length = 1 to n, where length = n will happen to be the one
  // result we would need to output.
  while (++i <= n) {
    slicedExpendedEncodedSounds = expendedEncodedSounds.slice(0, i);
    lastComposedResultData = this.cache.get(slicedExpendedEncodedSounds);
    // Empty result will be cached as a |null|. A "not found" result is
    // explicitly an undefined.
    if (lastComposedResultData === undefined) {
      lastComposedResultData = this._getFirstComposedResult(
        slicedExpendedEncodedSounds, previousFirstResults);
      this.addToCache(slicedExpendedEncodedSounds, lastComposedResultData);
    }
    previousFirstResults[i] = lastComposedResultData;
  }

  return lastComposedResultData;
};
JSZhuyinComposedCandidatesBuilder.prototype._getFirstComposedResult =
function(expendedEncodedSounds, previousFirstResults) {
  var storage = this.storage;

  // We would only need to worry about an element in previousFirstResults
  // follow by exactly one phrase, instead of getting all possible
  // compositions, because it will always be ruled out.

  var composedResultDataArr = previousFirstResults
    .reduce(function(composedResultDataArr, previousFirstResult, i) {
      if (i !== 0 && previousFirstResult === null) {
        return composedResultDataArr;
      }

      BopomofoEncoder.getSymbolCombinations(expendedEncodedSounds.slice(i))
        .filter(function(symbolCodes) {
          return (symbolCodes.length <= this.LONGEST_PHRASE_LENGTH);
        }.bind(this))
        .map(function(symbolCodes) {
          return [storage.getIncompleteMatched(symbolCodes), symbolCodes];
        })
        .filter(function(symbolCodesResultData) {
          return !!symbolCodesResultData[0];
        })
        .map(function(symbolCodesResultData) {
          var symbolCodesFirstResult =
            symbolCodesResultData[0].getFirstResult();
          var composedResultData;
          if (i !== 0) {
            composedResultData = [].concat(previousFirstResult);
            composedResultData[0] += symbolCodesFirstResult.str;
            composedResultData[1] += symbolCodesFirstResult.score;
            composedResultData[2] = symbolCodesFirstResult.index;
          } else {
            composedResultData =
              [ symbolCodesFirstResult.str,
                symbolCodesFirstResult.score,
                symbolCodesFirstResult.index,
                [ symbolCodesFirstResult.str,
                  BopomofoEncoder.decode(symbolCodesResultData[1]).length ] ];
          }

          return composedResultData;
        })
        .forEach(function(composedResultData) {
          composedResultDataArr.push(composedResultData);
        });

      return composedResultDataArr;
    }.bind(this), /* composedResultDataArr */ [])
    .sort(function(a, b) {
      if (b[1] > a[1]) {
        return 1;
      }
      if (b[1] < a[1]) {
        return -1;
      }
      if (b[0] > a[0]) {
        return 1;
      }
      if (b[0] < a[0]) {
        return -1;
      }
      return 0;
    });

  return composedResultDataArr[0] || null;
};
var JSZhuyinPartialMatchingCandidatesBuilder = function() {
};
JSZhuyinPartialMatchingCandidatesBuilder.prototype.load = function(storage) {
  this.storage = storage;
};
JSZhuyinPartialMatchingCandidatesBuilder.prototype.unload = function() {
  this.cache = null;
};
JSZhuyinPartialMatchingCandidatesBuilder.prototype.getCandidates =
function(queryData) {
  var storage = this.storage;

  var insertFullyMatched =
    (queryData.getTrimmedSymbols() !== queryData.symbols);

  var dataPackResultDataArr = queryData.getTrimmedSymbolsCombinations()
    .map(function(symbolCodes) {
      var symbolCodeDataArr = [];
      var arr, symbolLength;
      var i = -1;
      var n = insertFullyMatched ? symbolCodes.length : symbolCodes.length - 1;
      while (i++ < n) {
        arr = symbolCodes.slice(0, i);
        symbolLength = BopomofoEncoder.decode(arr).length;
        symbolCodeDataArr.push([symbolLength, arr]);
      }

      return symbolCodeDataArr;
    })
    .reduce(function(orderedSymbolCodeArrs, symbolCodeDataArr) {
      symbolCodeDataArr.forEach(function(symbolCodeData) {
        if (!orderedSymbolCodeArrs[symbolCodeData[0]]) {
          orderedSymbolCodeArrs[symbolCodeData[0]] = [];
        }
        orderedSymbolCodeArrs[symbolCodeData[0]].push(symbolCodeData[1]);
      });

      return orderedSymbolCodeArrs;
    }, /* orderedSymbolCodeArrs */ [])
    .map(function(symbolCodeArrs, i) {
      var allDataPackResult = symbolCodeArrs
        .map(function(symbolCodes) {
          if (!i || !storage.getIncompleteMatched(symbolCodes)) {
            return null;
          }

          return storage.getIncompleteMatched(symbolCodes).getResults();
        })
        .filter(function(dataPackResult) {
          return dataPackResult !== null;
        })
        .reduce(function(allDataPackResult, dataPackResult) {
          return allDataPackResult.concat(dataPackResult);
        }, /* allDataPackResult */ [])
        .sort(function(a, b) {
          if (b.score > a.score) {
            return 1;
          }
          if (b.score < a.score) {
            return -1;
          }
          if (b.str > a.str) {
            return 1;
          }
          if (b.str < a.str) {
            return -1;
          }
          return 0;
        });

      return [i, allDataPackResult];
    })
    .reverse();

  return dataPackResultDataArr;
};
/**
 * The main IME logic.
 * @this   {object}   JSZhuyin instance.
 */
var JSZhuyin = function JSZhuyin() {
  this.storage = null;

  this.symbols = '';
  this.confirmedPartIndex = 0;
  this.confirmedCharacters = '';
  this.defaultCandidate = undefined;

  this.composedCandidatesBuilder = new JSZhuyinComposedCandidatesBuilder();
  this.partiallyMatchedCandidatesBuilder =
    new JSZhuyinPartialMatchingCandidatesBuilder();

  this.overflowCandidateString = '';
  this.overflowCandidateSymbolLength = 0;
  this.queue = null;
  this.candidateMetadata = null;
};
/**
 * Limit the length of the symbols in the compositions.
 * @type {number}
 */
JSZhuyin.prototype.MAX_SOUNDS_LENGTH = 48;
/**
 * Longest possible phrase in the database, any longer than this will not be
 * matched
 * @type {Number}
 */
JSZhuyin.prototype.LONGEST_PHRASE_LENGTH = 6;
/**
 * Suggest phrases after confirming characters.
 * @type {boolean}
 */
JSZhuyin.prototype.SUGGEST_PHRASES = true;
/**
 * Allow re-order of symbol input.
 * Better error-handling for typing with hardware keyboard.
 */
JSZhuyin.prototype.REORDER_SYMBOLS = false;
/**
 * When searching for matching words/phrases, consider these pairs of symbols
 * are interchangables.
 * Must be a string representing 2n sounds in Bopomofo symbols.
 *
 * Example string: 'ㄣㄥㄌㄖㄨㄛㄡ', making ㄣ interchangable with ㄥ and
 * ㄌ interchangable with ㄖ, and ㄨㄛ with ㄡ.
 * @type {string}
 */
JSZhuyin.prototype.INTERCHANGABLE_PAIRS = '';
/**
 * Overwritten path of database file.
 * @type {string}
 */
JSZhuyin.prototype.dataURL = '';
/**
 * Run when the loading is complete.
 * @type {function}
 */
JSZhuyin.prototype.onloadend = null;
/**
 * Run when loading is successful.
 * @type {function}
 */
JSZhuyin.prototype.onload = null;
/**
 * Run when unload.
 * @type {function}
 */
JSZhuyin.prototype.onunload = null;
/**
 * Run when error occours.
 * @type {function}
 */
JSZhuyin.prototype.onerror = null;
/**
 * Run when an action is handled; receives reqId passed to the functions.
 * @type {function}
 */
JSZhuyin.prototype.onactionhandled = null;
/**
 * Callback to call when the composition updates.
 * @type {function}
 */
JSZhuyin.prototype.oncompositionupdate = null;
/**
 * Callback to call when the composition ends.
 * @type {function}
 */
JSZhuyin.prototype.oncompositionend = null;
/**
 * Callback to call when candidate menu updates.
 * @type {function}
 */
JSZhuyin.prototype.oncandidateschange = null;

/**
 * Handle a key with it's DOM UI Event Level 3 key value.
 * @param  {string} key   The key property of the key to handle,
 *                        should be the printable character or a registered
 *                        name in the spec.
 * @param  {any}   reqId  ID of the request.
 * @return {boolean}      Return true if the key will be handled async.
 * @this   {object}       JSZhuyin instance.
 */
JSZhuyin.prototype.handleKey = function jz_handleKey(key, reqId) {
  if (!this.queue) {
    throw 'JSZhuyin: You need to load() first.';
  }

  if (typeof key !== 'string') {
    throw 'JSZhuyin: key passed to handleKey must be a string.';
  }

  if (BopomofoEncoder.isBopomofoSymbol(key)) {
    // We must handle Bopomofo symbols.
    this.queue.queue('key', key, reqId);

    return true;
  }

  if (this.defaultCandidate || this.symbols) {
    // We must handle all the keys if there are pending symbols or candidates.
    this.queue.queue('key', key, reqId);

    return true;
  }

  return false;
};

/**
 * Handle a key event with it's keyCode or charCode. Deprecated.
 * @param  {number} code  charCode of the keyboard event.
 *                        If charCode is 0, you should pass keyCode instead.
 * @param  {any}   reqId  ID of the request.
 * @return {boolean}      Return true if the key will be handled async.
 * @this   {object}       JSZhuyin instance.
 */
JSZhuyin.prototype.handleKeyEvent = function jz_handleKeyEvent(code, reqId) {
  var key;
  switch (code) {
    case 0x08:
      key = 'Backspace';
      break;
    case 0x0d:
      key = 'Enter';
      break;
    case 0x1b:
      key = 'Escape';
      break;
    default:
      // XXX: We are considering everything reach here is a printable character.
      key = String.fromCharCode(code);
  }

  return this.handleKey(key, reqId);
};

/**
 * Select a candidate. Will be handled in the action queue.
 * @param  {object} candidate One of the candidate that was sent via
 *                            oncandidateschange callback.
 * @param  {any}    reqId     ID of the request.
 * @this   {object}           JSZhuyin instance.
 */
JSZhuyin.prototype.selectCandidate = function jz_selCandi(candidate, reqId) {
  if (!Array.isArray(candidate) ||
      typeof candidate[0] !== 'string' ||
      typeof candidate[1] !== 'number') {
    throw new Error('JSZhuyin: ' +
      'malformed candidate object in selectCandidate call.');
  }

  this.queue.queue('candidateSelection', candidate, reqId);
};
/**
 * Load JSZhuyin; loading the database and register callbacks, etc.
 * @this   {object}   JSZhuyin instance.
 */
JSZhuyin.prototype.load = function jz_load(data) {
  if (this.loaded) {
    throw 'Already loaded.';
  }
  this.loaded = true;

  this.symbols = '';
  this.defaultCandidate = undefined;

  this.queue = new ActionQueue();
  this.queue.handle = this.handle.bind(this);

  this.storage = new JSZhuyinDataPackStorage();

  this.candidateMetadata = new JSZhuyinCandidateMetadata();
  this.composedCandidatesBuilder.load(this.storage);
  this.partiallyMatchedCandidatesBuilder.load(this.storage);

  if (data instanceof ArrayBuffer) {
    this.storage.load(data);
    if (typeof this.onload === 'function') {
      this.onload();
    }
    if (typeof this.onloadend === 'function') {
      this.onloadend();
    }
  } else {
    this.dataLoader = new DataLoader();
    if (this.dataURL) {
      this.dataLoader.DATA_URL = this.dataURL;
    }
    this.dataLoader.onerror = function() {
      if (typeof this.onerror === 'function') {
        this.onerror();
      }
    }.bind(this);
    this.dataLoader.onload = function() {
      this.storage.load(this.dataLoader.data);
      if (typeof this.onload === 'function') {
        this.onload();
      }
    }.bind(this);
    this.dataLoader.onloadend = function() {
      if (typeof this.onloadend === 'function') {
        this.onloadend();
      }
    }.bind(this);
    this.dataLoader.load();
  }
};
/**
 * Set configurations.
 * @param {object}  config      Configuration to set on JSZhuyin.
 */
JSZhuyin.prototype.setConfig = function(config) {
  for (var key in config) {
    this[key] = config[key];
  }
};
/**
 * Unload JSZhuyin. Close the database connection and purge things
 * from memory.
 * @this   {object}   JSZhuyin instance.
 */
JSZhuyin.prototype.unload = function jz_unload() {
  if (!this.loaded) {
    throw 'Already unloaded.';
  }
  this.loaded = false;

  if (this.storage) {
    this.storage.unload();
    this.storage = null;
  }

  if (this.dataLoader) {
    this.dataLoader = null;
  }

  if (this.composedCandidatesBuilder) {
    this.composedCandidatesBuilder.unload();
    this.composedCandidatesBuilder = null;
  }

  if (this.partiallyMatchedCandidatesBuilder) {
    this.partiallyMatchedCandidatesBuilder.unload();
    this.partiallyMatchedCandidatesBuilder = null;
  }

  this.symbols = '';
  this.storage = null;
  this.defaultCandidate = undefined;
  this.queue.handle = null;
  this.queue = null;

  if (typeof this.onunload === 'function') {
    this.onunload();
  }
};
/**
 * Actual function to handle an action in the action queue.
 * You should not call this method directly.
 * @param  {string} type   A type keyword.
 * @param  {any}    data   Data to handle for the action.
 * @param  {any}    reqId  ID of the request.
 * @this   {object}        JSZhuyin instance.
 */
JSZhuyin.prototype.handle = function jz_handle(type, data, reqId) {
  switch (type) {
    case 'key':
      if (BopomofoEncoder.isBopomofoSymbol(data)) {
        var mode = this.REORDER_SYMBOLS ?
          BopomofoEncoder.APPEND_MODE_REORDER :
          BopomofoEncoder.APPEND_MODE_NONE;

        this.symbols =
          BopomofoEncoder.appendToSymbols(this.symbols, data, mode);
        this.updateComposition(reqId);
        this.query(reqId);

        break;
      }

      switch (data) {
        case 'Backspace':
          if (this.symbols.length === 0) {
            // Sliently discard the key here. Any meaningful response at
            // this stage would be throw the event back to the client,
            // which it would not be able to handle it either.
            this.sendActionHandled(reqId);
            this.queue.done();

            break;
          }

          this.symbols = this.symbols.substr(0, this.symbols.length - 1);
          this.updateComposition(reqId);
          this.query(reqId);

          break;

        case 'Enter':
          if (!this.defaultCandidate) {
            // Sliently discard the key here. Any meaningful response at
            // this stage would be throw the event back to the client,
            // which it would not be able to handle it either.
            this.sendActionHandled(reqId);
            this.queue.done();

            break;
          }

          this.confirmCandidate(this.defaultCandidate, reqId);

          break;

        case 'Escape':
          this.symbols = '';
          this.updateComposition(reqId);
          this.query(reqId);

          break;

        default:
          // All other keys.
          // XXX: We could only handle it as if it's a printable character here.
          this.confirmCandidate(
            [this.defaultCandidate[0] + data, this.defaultCandidate[1]], reqId);

          break;
      }

      break;

    case 'candidateSelection':
      this.confirmCandidate(data, reqId);

      break;

    default:
      throw 'Unknown action type: ' + type;
  }
};
/**
 * Run the query against the current symbols.
 * You should not call this method directly.
 * @param  {any}    reqId  ID of the request.
 * @this   {object}        JSZhuyin instance.
 */
JSZhuyin.prototype.query = function jz_query(reqId) {
  if (this.symbols.length === 0) {
    this.candidateMetadata.clear();
    this.updateCandidates([]);
    this.sendActionHandled(reqId);
    this.queue.done();

    return;
  }

  // First, create the object that holds different forms of our current
  // symbols to query.
  var queryData = new JSZhuyinQueryData(
    this.symbols, this.LONGEST_PHRASE_LENGTH);

  // Confirming the overflow candidate if the lengths is too long.
  if (queryData.expendedEncodedSounds.length > this.MAX_SOUNDS_LENGTH) {
    this.endComposition(this.overflowCandidateString, reqId);

    this.symbols = this.symbols.substr(this.overflowCandidateSymbolLength);
    queryData = new JSZhuyinQueryData(this.symbols, this.LONGEST_PHRASE_LENGTH);
    this.updateComposition(reqId);
  }

  this.storage.setInterchangeablePairs(this.INTERCHANGABLE_PAIRS);

  // ==== START COMPOSING THE RESULT ====

  var results = [];
  var storage = this.storage;

  this.overflowCandidateString = '';
  this.overflowCandidateSymbolLength = 0;
  this.candidateMetadata.clear();

  // ==== PART I: PHRASES ====
  // List all the choices if the entire query happens to match to
  // phrases.
  results = this._insertFullyMatchingCandidates(results, queryData);

  // ==== PART II: COMPOSED RESULTS ====
  // Insert one composed results, composed by the top-ranked phrases.
  results = this._insertFullyMatchingComposedCandidates(results, queryData);

  // ==== PART III: PHRASES THAT MATCHES SYMBOLS PARTIALLY ====
  results = this._insertPartialMatchingCandidates(results, queryData);

  // ==== PART IV: UNFORTUNATE TYPO ====
  // Lastly, append the symbols as the last candidate to give out a proper
  // feedback (if applicable).
  results = this._insertTypoHints(results, queryData.expendedEncodedSounds);

  this.updateCandidates(results);
  this.sendActionHandled(reqId);

  // Remove extra data in the composed result cache.
  this.composedCandidatesBuilder.cleanupCache(queryData.expendedEncodedSounds);

  // Flatten codes array of all single compositions for cache cleanning in
  // storage.
  // TODO: We don't really need to keep every sliced code for some sequences
  // that would always backed by composed result cache.
  var supersetCodes = BopomofoEncoder.getSymbolCombinations(this.symbols)
    .reduce(function(supersetCodes, symbolCodes) {
      return supersetCodes.concat(symbolCodes);
    }, /* supersetCodes */ []);
  // Remove cache entires from storage cache.
  storage.cleanupCache(supersetCodes);

  this.queue.done();
};
/**
 * Internal method for Part I of query(), fully matched candidates into the
 * result.
 * @param  {array(array(string, number))} results      Result candidates.
 * @param  {object}                       queryData    JSZhuyinQueryData
 *                                                     instance.
 * @return {array(array(string, number))} The result candidates array passed
 *                                        (modified in-place).
 */
JSZhuyin.prototype._insertFullyMatchingCandidates =
function(results, queryData) {
  if (queryData.getTrimmedSymbols() !== this.symbols) {
    return results;
  }

  var storage = this.storage;

  var expendedEncodedSounds = queryData.expendedEncodedSounds;
  var combinations = queryData.getTrimmedSymbolsCombinations();

  combinations
    .map(function(symbolCodes) {
      // No need to search in the storage.
      if (symbolCodes.length > this.LONGEST_PHRASE_LENGTH) {
        return null;
      }

      return storage.getIncompleteMatched(symbolCodes);
    }.bind(this))
    .reduce(function(resultsArr, dataPack) {
      if (!dataPack) {
        return resultsArr;
      }

      return resultsArr.concat(dataPack.getResults());
    }, /* resultsArr */ [])
    .sort(function(a, b) {
      if (b.score > a.score) {
        return 1;
      }
      if (b.score < a.score) {
        return -1;
      }
      if (b.str > a.str) {
        return 1;
      }
      if (b.str < a.str) {
        return -1;
      }
      return 0;
    })
    .forEach(function(result, i) {
      if (!this.overflowCandidateString) {
        this.overflowCandidateString = result.str;
        this.overflowCandidateSymbolLength = this.symbols.length;
      }

      if (i === 0) {
        this.composedCandidatesBuilder.addToCache(
          expendedEncodedSounds,
          [ result.str, result.index, result.score,
            [ result.str, this.symbols.length ] ]);
      }

      results.push([result.str,
        this.candidateMetadata.saveData(this.symbols.length, result.index)]);
    }.bind(this));

  return results;
};
/**
 * Internal method for Part I of query(), fully matched candidates into the
 * result.
 * @param  {array(array(string, number))} results      Result candidates.
 * @param  {object}                       queryData    JSZhuyinQueryData
 *                                                     instance.
 * @return {array(array(string, number))} The result candidates array passed
 *                                        (modified in-place).
 */
JSZhuyin.prototype._insertFullyMatchingComposedCandidates =
function(results, queryData) {
  // We don't need to compose any results if there is already results from
  // part I.
  // Assuming Part II reult is always inferior than Part I result?
  if (results.length) {
    return results;
  }

  this.composedCandidatesBuilder.LONGEST_PHRASE_LENGTH =
    this.LONGEST_PHRASE_LENGTH;

  var composedResultData =
    this.composedCandidatesBuilder.getComposedCandidates(queryData);

  if (!composedResultData) {
    return results;
  }

  if (!this.overflowCandidateString) {
    this.overflowCandidateString = composedResultData[3][0];
    this.overflowCandidateSymbolLength = composedResultData[3][1];
  }

  // XXX: suggest() not only needs the lastPartIndex but also the last
  // part of the confirmed characters to work.
  results.push([composedResultData[0],
    this.candidateMetadata.saveData(
      this.symbols.length, composedResultData[2])]);

  return results;
};
/**
 * Internal method for Part III of query(), insert partially matched candidates
 * into results object
 * @param  {array(array(string, number))} results      Result candidates.
 * @param  {object}                       queryData    JSZhuyinQueryData
 *                                                     instance.
 * @return {array(array(string, number))} The result candidates array passed
 *                                        (modified in-place).
 */
JSZhuyin.prototype._insertPartialMatchingCandidates =
function(results, queryData) {
  var dataPackResultDataArr =
    this.partiallyMatchedCandidatesBuilder.getCandidates(queryData);

  dataPackResultDataArr
    .forEach(function(dataPackResultData) {
      var symbolLength = dataPackResultData[0];
      dataPackResultData[1].forEach(function(result) {
        var isDuplication = [].concat(results).reverse()
          .some(function(previousResult) {
            return (previousResult[0] === result.str);
          });

        if (isDuplication) {
          return;
        }

        if (results.length === 0) {
          // If there is still no candidate from any of the previous parts,
          // we could have to construct a candidate covering all symbols here,
          // to ensure there is enough feedback in the candidate panel when
          // user types.
          //
          // (Unlikely happen on real database though)
          results.push([
            result.str + this.symbols.substr(symbolLength),
            this.candidateMetadata.saveData(this.symbols.length, 0) ]);
        }

        if (!this.overflowCandidateString) {
          this.overflowCandidateString = result.str;
          this.overflowCandidateSymbolLength = symbolLength;
        }

        var res = [result.str,
          this.candidateMetadata.saveData(symbolLength, result.index)];
        results.push(res);
      }.bind(this));
    }.bind(this));

  return results;
};
/**
 * Internal method for Part IV of query(), insert typo hints.
 * into results object
 * @param  {array(array(string, number))} results               Result
 *                                                              candidates.
 * @param  {array(number)}                expendedEncodedSounds Symbols encoded.
 * @return {array(array(string, number))} The result candidates array passed
 *                                        (modified in-place).
 */
JSZhuyin.prototype._insertTypoHints = function(results, expendedEncodedSounds) {
  var storage = this.storage;

  // If there is still no candidate from any of the previous parts,
  // we would need to show the enitre string as-is.
  if (results.length === 0 && expendedEncodedSounds.length > 1) {
    results.push([
      this.symbols,
      this.candidateMetadata.saveData(this.symbols.length, 0) ]);
  }

  // Show the first sound symbols if it doesn't match anything itself.
  // (not likely to happen to the real dataset)
  var str;
  if (!storage.getIncompleteMatched([expendedEncodedSounds[0]])) {
    str = BopomofoEncoder.decode([expendedEncodedSounds[0]]);
    results.push([str, this.candidateMetadata.saveData(str.length, 0)]);
  }

  str = BopomofoEncoder.decode([expendedEncodedSounds[0]]);
  if (!this.overflowCandidateString) {
    this.overflowCandidateString = str;
    this.overflowCandidateSymbolLength = str.length;
  }

  return results;
};
/**
 * Suggest possible phrases after the user had enter a term.
 * @param  {any}    reqId  ID of the request.
 * @this   {object}        JSZhuyin instance.
 */
JSZhuyin.prototype.suggest = function jz_suggest(reqId) {
  this.candidateMetadata.clear();

  if (this.confirmedPartIndex === 0 ||
      !this.SUGGEST_PHRASES) {
    this.updateCandidates([]);
    this.sendActionHandled(reqId);
    this.queue.done();
    return;
  }

  var suggests = [];

  var confirmedCharactersLength = this.confirmedCharacters.length;
  var results = this.storage.getRangeFromContentIndex(this.confirmedPartIndex);
  results.forEach(function each_suggest(dataPack) {
    var dataPackResults =
      dataPack.getResultsBeginsWith(this.confirmedCharacters);
    dataPackResults.forEach(function each_result(dataPackResult) {
      // Don't push duplicate entries.
      var found = suggests.some(function finddup(suggest) {
        return (dataPackResult.str === suggest.str);
      });

      if (!found) {
        suggests.push(dataPackResult);
      }
    });
  }.bind(this));

  var candidates = [];
  suggests.sort(function sort_suggests(a, b) {
    if (b.score > a.score) {
      return 1;
    }
    if (b.score < a.score) {
      return -1;
    }
    if (b.str > a.str) {
      return 1;
    }
    if (b.str < a.str) {
      return -1;
    }
    return 0;
  }).forEach(function each_suggests(suggests) {
    candidates.push([
      suggests.str.substr(confirmedCharactersLength),
      this.candidateMetadata.NULL_ID]);
  }, this);

  this.updateCandidates(candidates);
  this.sendActionHandled(reqId);
  this.queue.done();
};
/**
 * Update composition by call the oncompositionupdate callback.
 * You should not call this method directly.
 * @param  {any}    reqId  ID of the request.
 * @this   {object}        JSZhuyin instance.
 */
JSZhuyin.prototype.updateComposition = function jz_updateComposition(reqId) {
  if (typeof this.oncompositionupdate === 'function') {
    this.oncompositionupdate(this.symbols, reqId);
  }
};
/**
 * End composition by call the oncompositionend callback.
 * You should not call this method directly.
 * @param  {string} str    String to end composition with.
 * @param  {any}    reqId  ID of the request.
 * @this   {object}        JSZhuyin instance.
 */
JSZhuyin.prototype.endComposition = function jz_endComposition(str, reqId) {
  if (typeof this.oncompositionend === 'function') {
    this.oncompositionend(str, reqId);
  }
};
/**
 * Update the candidate with query results.
 * You should not call this method directly.
 * @param  {array}  results  The result array.
 * @param  {any}    reqId    ID of the request.
 * @this   {object}          JSZhuyin instance.
 */
JSZhuyin.prototype.updateCandidates = function jz_updateCandidates(results,
                                                                      reqId) {
  this.defaultCandidate = results[0];

  if (typeof this.oncandidateschange === 'function') {
    this.oncandidateschange(results, reqId);
  }
};
/**
 * Confirm a selection by calling the compositionend callback and run
 * the query again.
 * You should not call this method directly.
 * @param  {object} candidate One of the candidate that was sent via
 *                            oncandidateschange callback.
 * @param  {any}    reqId     ID of the request.
 * @this   {object}           JSZhuyin instance.
 */
JSZhuyin.prototype.confirmCandidate = function jz_confirmCandidate(candidate,
                                                                   reqId) {
  this.endComposition(candidate[0], reqId);

  this.confirmedCharacters = candidate[0];

  var metadata = this.candidateMetadata.getData(candidate[1]);

  this.confirmedPartIndex = metadata[1];
  this.symbols = this.symbols.substr(metadata[0]);
  this.updateComposition(reqId);

  if (this.symbols.length !== 0) {
    this.query(reqId);
  } else {
    this.suggest(reqId);
  }
};
/**
 * Call the onactionhandled callback.
 * You should not call this method directly.
 * @param  {any}    reqId    ID of the request.
 * @this   {object}          JSZhuyin instance.
 */
JSZhuyin.prototype.sendActionHandled = function jz_sendActionHandled(reqId) {
  if (typeof this.onactionhandled === 'function') {
    this.onactionhandled(reqId);
  }
};
