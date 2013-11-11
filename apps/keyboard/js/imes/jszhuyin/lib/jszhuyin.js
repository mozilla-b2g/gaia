'use strict';

/**
 * A simple key-value store wrapps with JavaScript object.
 * @this   {object}   CacheStore instance.
 */
var CacheStore = function CacheStore() {
  this.data = Object.create(null);
  this.waiting = false;
};
/**
 * set the value of a key.
 * @param  {string} key   Key.
 * @param  {any}    value Value.
 * @this   {object}       CacheStore instance.
 */
CacheStore.prototype.add = function cs_add(key, value) {
  this.data[key] = value;
};
/**
 * get the value of a key.
 * @param  {string} key Key.
 * @return {any}        Value of the key.
 * @this   {object}     CacheStore instance.
 */
CacheStore.prototype.get = function cs_get(key) {
  return this.data[key];
};
/**
 * Clean up the store. Any key that is not a substring of the superset
 * string will have their value removed.
 * @param  {string} supersetStr The superset string.
 * @this   {object}             CacheStore instance.
 */
CacheStore.prototype.cleanup = function cs_cleanup(supersetStr) {
  for (var key in this.data) {
    if (supersetStr.indexOf(key) !== -1)
      continue;

    this.data[key] = undefined;
  }
};

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
ActionQueue.prototype.queue = function aq_queue() {
  if (this.waiting) {
    this.pendingActions.push(arguments);
    return;
  }

  this.waiting = true;
  this.handle.apply(this, arguments);
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

/**
 * The main IME logic.
 * @this   {object}   JSZhuyin instance.
 */
var JSZhuyin = function JSZhuyin() {
  this.JSON_FILES = ['words.json',
                     'phrases0.json', 'phrases1.json',
                     'phrases2.json', 'phrases3.json',
                     'more0.json', 'more1.json',
                     'more2.json', 'more3.json', 'shortcuts.json',
                     'shortcuts-more0.json', 'shortcuts-more1.json',
                     'shortcuts-more2.json', 'shortcuts-more3.json'];
  this.storage = null;

  this.syllables = '';
  this.confirmedEncodedStr = '';
  this.confirmedCharacters = '';
  this.defaultCandidate = undefined;
  this.cache = null;
  this.queue = null;
};
/**
 * Limit the length of the syllables in the compositions.
 * @type {number}
 */
JSZhuyin.prototype.MAX_SYLLABLES_LENGTH = 8;
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
 * Database file to load.
 * @type {string}
 */
JSZhuyin.prototype.DATA_URL = '../data/database.data';
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
 * Handle a key event.
 * @param  {number} code  charCode of the keyboard event.
 *                        If charCode is 0, you should pass keyCode instead.
 * @param  {any}   reqId  ID of the request.
 * @return {boolean}      Return true if the key will be handled async.
 * @this   {object}       JSZhuyin instance.
 */
JSZhuyin.prototype.handleKeyEvent = function jz_handleKeyEvent(code, reqId) {
  if (!this.queue)
    throw 'JSZhuyin: You need to load() first.';

  if (typeof code !== 'number')
    throw 'JSZhuyin: code passed to handleKeyEvent must be a number.';

  if (BopomofoEncoder.isBopomofoSymbol(code)) {
    // We must handle Bopomofo symbols.
    this.queue.queue('keyEvent', code, reqId);

    return true;
  }

  if (this.defaultCandidate || this.syllables) {
    // We must handle all the keys if there are pending symbols or candidates.
    this.queue.queue('keyEvent', code, reqId);

    return true;
  }

  return false;
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
      typeof candidate[1] !== 'string') {
    throw 'JSZhuyin: malformed candidate object in selectCandidate call.';
  }

  this.queue.queue('candidateSelection', candidate, reqId);
};
/**
 * Load JSZhuyin; loading the database and register callbacks, etc.
 * @this   {object}   JSZhuyin instance.
 */
JSZhuyin.prototype.load = function jz_load() {
  if (this.loaded)
    throw 'Already loaded.';
  this.loaded = true;

  var storage = this.storage = new BinStorage();
  storage.DATA_URL = this.DATA_URL;

  storage.onerror = this.onerror;
  storage.onload = this.onload;
  storage.onloadend = this.onloadend;

  this.syllables = '';
  this.defaultCandidate = undefined;
  this.cache = new CacheStore();
  this.queue = new ActionQueue();
  this.queue.handle = this.handle.bind(this);

  storage.load();
};
/**
 * Unload JSZhuyin. Close the database connection and purge things
 * from memory.
 * @this   {object}   JSZhuyin instance.
 */
JSZhuyin.prototype.unload = function jz_unload() {
  if (!this.loaded)
    throw 'Already unloaded.';
  this.loaded = false;

  if (this.storage)
    this.storage.unload();

  this.syllables = '';
  this.storage = null;
  this.defaultCandidate = undefined;
  this.cache = null;
  this.queue.handle = null;
  this.queue = null;

  if (typeof this.onunload === 'function')
    this.onunload();
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
  var BOPOMOFO_START = 0x3105;
  var BOPOMOFO_END = 0x3129;
  var BOPOMOFO_TONE_1 = 0x02c9;
  var BOPOMOFO_TONE_2 = 0x02ca;
  var BOPOMOFO_TONE_3 = 0x02c7;
  var BOPOMOFO_TONE_4 = 0x02cb;
  var BOPOMOFO_TONE_5 = 0x02d9;

  switch (type) {
    case 'keyEvent':
      if (BopomofoEncoder.isBopomofoSymbol(data)) {
        // This is a Bopomofo symbol
        if (!this.REORDER_SYMBOLS) {
          this.syllables += String.fromCharCode(data);
        } else {
          this.syllables = BopomofoEncoder.decode(BopomofoEncoder.encode(
              this.syllables + String.fromCharCode(data), {
                reorder: true
              }));
        }
        this.updateComposition(reqId);
        this.query(reqId);

        break;
      }

      switch (data) {
        case 0x08: // Backspace key
          if (this.syllables.length === 0) {
            // Sliently discard the key here. Any meaningful response at
            // this stage would be throw the event back to the client,
            // which it would not be able to handle it either.
            this.sendActionHandled(reqId);
            this.queue.done();

            break;
          }

          this.syllables = this.syllables.substr(0, this.syllables.length - 1);
          this.updateComposition(reqId);
          this.query(reqId);

          break;

        case 0x0d: // Enter key
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

        case 0x1b: // Escape key
          this.syllables = '';
          this.updateComposition(reqId);
          this.query(reqId);

          break;

        default:   // All other keys
          var str = this.defaultCandidate[0] + String.fromCharCode(data);
          var count = this.defaultCandidate[1];
          this.confirmCandidate([str, count], reqId);

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
 * Run the query against the current syllables.
 * You should not call this method directly.
 * @param  {any}    reqId  ID of the request.
 * @this   {object}        JSZhuyin instance.
 */
JSZhuyin.prototype.query = function jz_query(reqId) {
  if (this.syllables.length === 0) {
    this.updateCandidates([]);
    this.sendActionHandled(reqId);
    this.queue.done();

    return;
  }

  // Encode the string into Bopomofo encoded string where
  // one character represents a syllables.
  var encodedStr = BopomofoEncoder.encode(this.syllables, {
    tone: 'more-than-one-symbol'
  });
  var encodedStrOriginal = BopomofoEncoder.encode(this.syllables);

  if (encodedStr.length > this.MAX_SYLLABLES_LENGTH) {
    this.confirmCandidate(this.firstMatchedPhrase, reqId);

    return;
  }

  // Get all posibility compositions of a given natural number.
  // There will be 2^(n-1) items in the compositions array.
  // See http://en.wikipedia.org/wiki/Composition_(number_theory)#Examples
  // also http://stackoverflow.com/questions/8375439
  var compositions = [];
  var x, a, j, n = encodedStr.length;
  x = 1 << n - 1;
  while (x--) {
    a = [1];
    j = 0;
    while (n - 1 > j) {
      if (x & (1 << j)) {
        a[a.length - 1]++;
      } else {
        a.push(1);
      }
      j++;
    }
    compositions.push(a);
  }

  // Figure out all the strings we need to query, and get them
  for (var i = 0; i < compositions.length; i++) {
    var composition = compositions[i];
    var start = 0;
    for (var j = 0; j < composition.length; j++) {
      var n = composition[j];
      var str = encodedStr.substr(start, n);
      if (!this.cache.get(str)) {
        var result = this.storage.get(str);
        if (result) {
          this.cache.add(str,
            new JSZhuyinDataPack(result[0], result[1], result[2]));
        }
      }

      start += n;
    }
  }

  this.cache.cleanup(encodedStr);

  // ==== START COMPOSING THE RESULT ====

  var results = [];
  var firstMatchedPhrase;
  var cache = this.cache;

  // ==== PART I: PHRASES ====
  // List all the choices if the entire query happens to match to
  // phrases.
  if (cache.get(encodedStr)) {
    var data = cache.get(encodedStr).getResults();
    for (var i = 0; i < data.length; i++) {
      var res = [data[i]['str'], (data[i]['symbols'] || encodedStr)];
      if (!firstMatchedPhrase) {
        firstMatchedPhrase = res;
      }
      results.push(res);
    }
  }

  // ==== PART II: COMPOSED RESULTS ====
  // Compose results with all the terms we could find.
  var composedResults = [];
  nextComposition: for (var i = 0; i < compositions.length; i++) {
    var composition = compositions[i];

    // The entire query has been processed by the previous step. Skip.
    if (composition.length === 1)
      continue nextComposition;

    // Compose a result (and it's score) for each of the compositions.
    var composedResult = '';
    var composedResultScore = 0;
    var composedSymbols = '';
    var start = 0;
    for (var j = 0; j < composition.length; j++) {
      var n = composition[j];
      var substr = encodedStr.substr(start, n);
      if (!cache.get(substr) && n > 1) {
        // Skip this compositions if there is no matching phrase.
        continue nextComposition;
      } else if (!cache.get(substr)) {
        // ... but, we don't skip non-matching compositions of
        // a single syllable to show the typo.
        composedResult +=
          BopomofoEncoder.decode(encodedStrOriginal.substr(start, n));
        composedResultScore += -Infinity;
        composedSymbols += encodedStr.substr(start, n);
      } else {
        // concat the term and add the score to the composed result.
        var dataFirstResult = cache.get(substr).getFirstResult();
        composedResult += dataFirstResult['str'];
        composedResultScore += dataFirstResult['score'];
        composedSymbols +=
          dataFirstResult['symbols'] || encodedStr.substr(start, n);
      }
      start += n;
    }

    // Avoid give out duplicated result here by checking the result array.
    var found = results.some(function finddup(result) {
      if (result[0] === composedResult)
        return true;
    });
    // ... and the composedResults array.
    if (!found) {
      found = composedResults.some(function finddup(result) {
        if (result[0] === composedResult)
          return true;
      });
    }
    // If nothing is found we are safe to push our own result.
    if (!found) {
      composedResults.push(
        [composedResult, composedResultScore, composedSymbols]);
    }
  }
  // Sort the results.
  composedResults = composedResults.sort(function sortComposedResults(a, b) {
    return b[1] - a[1];
  });
  // Push the result into the array.
  var length = encodedStr.length;
  for (var i = 0; i < composedResults.length; i++) {
    results.push([composedResults[i][0], composedResults[i][2]]);
  }
  // This is not really helpful for gc but we do this here to mark the end
  // of composition calculation.
  composedResults = undefined;

  // ==== PART III: PHRASES THAT MATCHES SYLLABLES PARTIALLY ====
  // List all the terms that exists where it matches the first i syllables.
  var i = encodedStr.length;
  while (i--) {
    var substr = encodedStr.substr(0, i);
    if (!cache.get(substr))
      continue;

    var data = cache.get(substr).getResults();
    var encodedSubStr = encodedStr.substr(0, i);
    for (var j = 0; j < data.length; j++) {
      var res = [data[j].str, encodedSubStr];
      if (!firstMatchedPhrase) {
        firstMatchedPhrase = res;
      }
      results.push(res);
    }
  }

  // ==== PART IV: UNFORTUNATE TYPO ====
  // Lastly, if the first syllable doesn't made up a word,
  // show the symbols.
  if (!cache.get(encodedStr[0])) {
    var res = [BopomofoEncoder.decode(encodedStrOriginal[0]), encodedStr[0]];
    if (!firstMatchedPhrase) {
      firstMatchedPhrase = res;
    }
    results.push(res);
  }

  this.firstMatchedPhrase = firstMatchedPhrase;
  this.updateCandidates(results);
  this.sendActionHandled(reqId);
  this.queue.done();
};
/**
 * Suggest possible phrases after the user had enter a term.
 * @param  {any}    reqId  ID of the request.
 * @this   {object}        JSZhuyin instance.
 */
JSZhuyin.prototype.suggest = function jz_suggest(reqId) {
  if (!this.SUGGEST_PHRASES) {
    this.sendActionHandled(reqId);
    this.queue.done();
    return;
  }

  if (this.confirmedEncodedStr.length === 0) {
    this.updateCandidates([]);
    this.sendActionHandled(reqId);
    this.queue.done();

    return;
  }

  this.updateCandidates([]);

  var suggests = [];

  var confirmedCharactersLength = this.confirmedCharacters.length;
  var results = this.storage.getRange(this.confirmedEncodedStr);
  results.forEach(function each_suggest(result) {
    var dataPackResults =
      (new JSZhuyinDataPack(result[0], result[1], result[2])).getResults();
    dataPackResults.forEach(function each_result(dataPackResult) {
      // We are pulling more data from database than we need here.
      // this might imply poor memory usage.
      if (dataPackResult.str.substr(0, confirmedCharactersLength) !==
          this.confirmedCharacters)
        return;

      var found = suggests.some(function finddup(suggest) {
      if (dataPackResult['str'] === suggest['str'])
        return true;
      });

      if (!found) {
        suggests.push(dataPackResult);
      }
    }.bind(this));
  }.bind(this));

  var candidates = [];
  suggests.sort(function sort_suggests(a, b) {
    // XXX For result other than the first one where we didn't get the score,
    // we will have to put them at the very back.
    var aScore = a.score || -Infinity;
    var bScore = b.score || -Infinity;
    return bScore - aScore;
  }).forEach(function each_suggests(suggests) {
    candidates.push([
      suggests.str.substr(confirmedCharactersLength), '']);
  });

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
  if (typeof this.oncompositionupdate === 'function')
    this.oncompositionupdate(this.syllables, reqId);
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

  if (typeof this.oncandidateschange === 'function')
    this.oncandidateschange(results, reqId);
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
  if (typeof this.oncompositionend === 'function')
    this.oncompositionend(candidate[0], reqId);

  this.confirmedCharacters = candidate[0];
  this.confirmedEncodedStr = candidate[1];
  this.syllables = BopomofoEncoder.decode(
    BopomofoEncoder.encode(this.syllables).substr(candidate[1].length));
  this.updateComposition(reqId);

  if (this.syllables.length !== 0) {
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
  if (typeof this.onactionhandled === 'function')
    this.onactionhandled(reqId);
};
