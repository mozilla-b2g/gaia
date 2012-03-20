/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function() {

  var debugging = false;
  var debug = function(str) {
    if (!debugging)
      return;

    if (window.dump)
      window.dump('JSZhuyin: ' + str + '\n');
    if (console && console.log) {
      console.log('JSZhuyin: ' + str);
      if (arguments.length > 1)
        console.log.apply(this, arguments);
    }
  };

  /* for non-Mozilla browsers */
  if (!KeyEvent) {
    var KeyEvent = {
      DOM_VK_BACK_SPACE: 0x8,
      DOM_VK_RETURN: 0xd
    };
  }

  var IMEngine = function ime() {
    var settings;

    var kBufferLenLimit = 8;
    var kDBTermMaxLength = 8;

    /* ==== init functions ==== */

    var db;

    var initDB = function ime_initDB(readyCallback) {
      var dbSettings = {
        wordsJSON: settings.path + '/words.json',
        phrasesJSON: settings.path + '/phrases.json'
      };

      if (readyCallback)
        dbSettings.ready = readyCallback;

      db = new IMEngineDatabase();
      db.init(dbSettings);
    }

    /* ==== helper functions ==== */

    var syllablesInBuffer = [''];
    var pendingSymbols = ['', '', '', ''];
    var firstCandidate = '';

    var SymbolType = {
      CONSTANT: 0,
      VOWEL1: 1,
      VOWEL2: 2,
      TONE: 3
    };

    var typeOfSymbol = function ime_typeOfSymbol(code) {

      var tones = [' ', '˙', 'ˊ', 'ˇ', 'ˋ'];

      /* ㄅ - ㄙ */
      if (code >= 0x3105 && code <= 0x3119)
        return SymbolType.CONSTANT;
      /* ㄧㄨㄩ */
      if (code >= 0x3127 && code <= 0x3129)
        return SymbolType.VOWEL1;
      /* ㄚ - ㄦ */
      if (code >= 0x311A && code <= 0x3126)
        return SymbolType.VOWEL2;
      /*  ˙ˊˇˋ */
      if (tones.indexOf(String.fromCharCode(code)) !== -1)
        return SymbolType.TONE;

      return false;
    };

    var empty = function ime_empty() {
      debug('Empty buffer.');
      syllablesInBuffer = [''];
      pendingSymbols = ['', '', '', ''];
      firstCandidate = '';
      isWorking = false;
      if (!db)
        initDB();
    };

    var lookup = function ime_lookup(syllables, type, callback) {
      switch (type) {
        case 'sentence':
          db.getSentences(syllables, function getSentencesCallback(dbResults) {
            if (!dbResults) {
              callback([]);
              return;
            }
            var results = [];
            dbResults.forEach(function readSentence(sentence) {
              var str = '';
              sentence.forEach(function readTerm(term) {
                str += term[0];
              });
              if (results.indexOf(str) === -1)
                results.push(str);
            });
            callback(results);
          });
        break;
        case 'term':
          db.getTerms(syllables, function getTermsCallback(dbResults) {
            if (!dbResults) {
              callback([]);
              return;
            }
            var results = [];
            dbResults.forEach(function readTerm(term) {
              results.push(term[0]);
            });
            callback(results);
          });
        break;
        default:
          debug('Error: no such lookup() type.');
        break;
      }
    };

    var updateCandidateList = function ime_updateCandidateList(callback) {
      debug('Update Candidate List.');

      if (!syllablesInBuffer.join('').length) {
        debug('Buffer is empty; send empty candidate list.');
        settings.sendCandidates([]);
        firstCandidate = '';
        callback();
        return;
      }

      var candidates = [];
      var syllablesForQuery = [].concat(syllablesInBuffer);

      if (pendingSymbols[SymbolType.TONE] === '' &&
          syllablesForQuery[syllablesForQuery.length - 1]) {
        debug('The last syllable is incomplete, add asterisk.');
        syllablesForQuery[syllablesForQuery.length - 1] =
          pendingSymbols.join('') + '*';
      }

      if (!syllablesForQuery[syllablesForQuery.length - 1]) {
        syllablesForQuery.pop();
      }

      debug('Get term candidates for the entire buffer.');
      lookup(syllablesForQuery, 'term', function lookupCallback(terms) {
        terms.forEach(function readTerm(term) {
          candidates.push([term, 'whole']);
        });

        if (syllablesInBuffer.length === 1) {
          debug('Only one syllable; skip other lookups.');

          if (!candidates.length) {
            // candidates unavailable; output symbols
            candidates.push([syllablesInBuffer.join(''), 'whole']);
          }

          settings.sendCandidates(candidates);
          firstCandidate = candidates[0][0];
          callback();
          return;
        }

        debug('Lookup for sentences that make up from the entire buffer');
        var syllables = syllablesForQuery;
        lookup(syllables, 'sentence', function lookupCallback(sentences) {
          sentences.forEach(function readSentence(sentence) {
            // look for candidate that is already in the list
            var exists = candidates.some(function sentenceExists(candidate) {
              return (candidate[0] === sentence);
            });

            if (exists)
              return;

            candidates.push([sentence, 'whole']);
          });

          firstCandidate = candidates[0][0];

          // The remaining candidates doesn't match the entire buffer
          // these candidates helps user find the exact character/term
          // s/he wants
          // The remaining unmatched syllables will go through lookup
          // over and over until the buffer is emptied.

          var i = Math.min(kDBTermMaxLength, syllablesInBuffer.length - 1);

          var findTerms = function lookupFindTerms() {
            debug('Lookup for terms that matches first ' + i + ' syllables.');

            var syllables = syllablesForQuery.slice(0, i);

            lookup(syllables, 'term', function lookupCallback(terms) {
              terms.forEach(function readTerm(term) {
                candidates.push([term, 'term']);
              });

              if (i === 1 && !terms.length) {
                debug('The first syllable does not make up a word, output the symbol.');
                candidates.push([syllables.join(''), 'symbol']);
              }

              if (!--i) {
                debug('Done Looking.');
                settings.sendCandidates(candidates);
                callback();
                return;
              }

              findTerms();
              return;
            });
          };

          findTerms();
        });
      });


    };

    /* ==== the keyQueue loop === */

    var keypressQueue = [];
    var isWorking = false;

    var next = function ime_next() {
      debug('Processing keypress');

      if (!db) {
        debug('DB not initialized, defer processing.');
        initDB(next);
        return;
      }
      if (!keypressQueue.length) {
        debug('keyQueue emptied.');
        isWorking = false;
        return;
      }

      var code = keypressQueue.shift();
      debug('key code: ' + code);

      if (code === KeyEvent.DOM_VK_RETURN) {
        debug('Return Key');
        if (!firstCandidate) {
          debug('Default action.');
          // pass the key to IMEManager for default action
          settings.sendKey(code);
          next();
          return;
        }

        // candidate list exists; output the first candidate
        debug('Sending first candidate.');
        settings.sendString(firstCandidate);
        settings.sendCandidates([]);
        empty();
        next();
        return;
      }

      if (code === KeyEvent.DOM_VK_BACK_SPACE) {
        debug('Backspace key');
        if (
          syllablesInBuffer.length === 1 &&
          syllablesInBuffer[0] === ''
        ) {
          // pass the key to IMEManager for default action
          debug('Default action.');
          settings.sendKey(code);
          next();
          return;
        }

        if (!pendingSymbols.join('')) {
          // pendingSymbols is empty; remove the last syllable in buffer
          debug('Remove last syllable.');
          syllablesInBuffer =
            syllablesInBuffer.slice(0, syllablesInBuffer.length - 1);
          syllablesInBuffer[syllablesInBuffer.length - 1] =
            pendingSymbols.join('');
          updateCandidateList(next);
          return;
        }

        debug('Remove pending symbols.');

        // remove the pendingSymbols
        pendingSymbols = ['', '', '', ''];
        syllablesInBuffer[syllablesInBuffer.length - 1] = '';
        updateCandidateList(next);
        return;
      }

      var type = typeOfSymbol(code);

      if (type === false) {
        debug('Non-bopomofo code');

        if (firstCandidate) {
          // candidate list exists; output the first candidate
          debug('Sending first candidate.');
          settings.sendString(firstCandidate);
          settings.sendCandidates([]);
          empty();

          // no return here
        }

        //pass the key to IMEManager for default action
        debug('Default action.');
        settings.sendKey(code);
        next();
        return;
      }

      var symbol = String.fromCharCode(code);

      debug('Processing symbol: ' + symbol);

      // add symbol to pendingSymbols
      pendingSymbols[type] = symbol;

      // update syllablesInBuffer
      syllablesInBuffer[syllablesInBuffer.length - 1] =
        pendingSymbols.join('');

      if (
        typeOfSymbol(code) === SymbolType.TONE &&
        (settings.bufferLenLimit || kBufferLenLimit) &&
        syllablesInBuffer.length >=
          (settings.bufferLenLimit || kBufferLenLimit)
      ) {
        // syllablesInBuffer is too long; find a term and sendString()
        debug('Buffer exceed limit');
        var i = syllablesInBuffer.length - 1;

        var findTerms = function ime_findTerms() {
          debug('Find term for first ' + i + ' syllables.');

          var syllables = syllablesInBuffer.slice(0, i);
          lookup(syllables, 'term', function lookupCallback(candidates) {
            if (i !== 1 && !candidates[0]) {
              // not found, keep looking
              i--;
              findTerms();
              return;
            }

            debug('Found.');

            // sendString
            settings.sendString(
              candidates[0] ||
              syllablesInBuffer.slice(0, i).join('')
            );

            // remove syllables from buffer
            while (i--) {
              syllablesInBuffer.shift();
            }

            updateCandidateList(function updateCandidateListCallback() {
              // bump the buffer to the next character
              syllablesInBuffer.push('');
              pendingSymbols = ['', '', '', ''];

              next();
            });
          });
        };

        findTerms();
        return;
      }

      updateCandidateList(function updateCandidateListCallback() {
        if (typeOfSymbol(code) === SymbolType.TONE) {
          // bump the buffer to the next character
          syllablesInBuffer.push('');
          pendingSymbols = ['', '', '', ''];
        }

        next();
      });
    };

    /* ==== init ==== */

    this.init = function ime_init(options) {
      debug('Init.');
      settings = options;
    };

    /* ==== uninit ==== */

    this.uninit = function ime_uninit() {
      debug('Uninit.');
      empty();
      db.uninit();
      db = null;
    };

    /* ==== interaction functions ==== */

    this.click = function ime_click(code) {
      debug('Click keyCode: ' + code);
      keypressQueue.push(code);

      if (isWorking)
        return;

      isWorking = true;
      debug('Start keyQueue loop.');
      next();
    };


    this.select = function ime_select(text, type) {
      debug('Select text ' + text);
      settings.sendString(text);

      var i = text.length;
      if (type == 'symbol')
        i = 1;

      while (i--) {
        syllablesInBuffer.shift();
      }

      if (!syllablesInBuffer.length) {
        syllablesInBuffer = [''];
        pendingSymbols = ['', '', '', ''];
      }

      updateCandidateList(function() {});
    };

    this.empty = empty;
  };

  var IMEngineDatabase = function imedb() {
    var settings;

    /* name and version of IndexedDB */
    var kDBName = 'JSZhuyin';
    var kDBVersion = 1;

    var jsonData;
    var iDB;

    var iDBCache = {};
    var cacheTimer;
    var kCacheTimeout = 10000;

    var self = this;

    var indexedDB = window.indexedDB ||
      window.webkitIndexedDB ||
      window.mozIndexedDB ||
      window.msIndexedDB;

    var IDBDatabase = window.IDBDatabase ||
      window.webkitIDBDatabase ||
      window.msIDBDatabase;

    var IDBTransaction = window.IDBTransaction ||
      window.webkitIDBTransaction ||
      window.msIDBTransaction;

    var IDBKeyRange = window.IDBKeyRange ||
      window.webkitIDBKeyRange ||
      window.msIDBKeyRange;

    /* ==== init functions ==== */

    var getTermsInDB = function imedb_getTermsInDB(callback) {
      if (!indexedDB || // No IndexedDB API implementation
          IDBDatabase.prototype.setVersion || // old version of IndexedDB API
          window.location.protocol === 'file:') {  // bug 643318
        debug('IndexedDB is not available on this platform.');
        callback();
        return;
      }

      var req = indexedDB.open(kDBName, kDBVersion);
      req.onerror = function dbopenError(ev) {
        debug('Encounter error while opening IndexedDB.');
        callback();
      };

      req.onupgradeneeded = function dbopenUpgradeneeded(ev) {
        debug('IndexedDB upgradeneeded.');
        iDB = ev.target.result;

        // delete the old ObjectStore if present
        if (iDB.objectStoreNames.length !== 0)
          iDB.deleteObjectStore('terms');

        // create ObjectStore
        iDB.createObjectStore('terms', { keyPath: 'syllables' });

        // no callback() here
        // onupgradeneeded will follow by onsuccess event
        return;
      };

      req.onsuccess = function dbopenSuccess(ev) {
        debug('IndexedDB opened.');
        iDB = ev.target.result;
        callback();
      };
    };

    var populateDBFromJSON = function imedbPopulateDBFromJSON(callback) {
      var chunks = [];
      var chunk = [];
      var i = 0;

      for (var syllables in jsonData) {
        chunk.push(syllables);
        i++;
        if (i > 2048) {
          chunks.push(chunk);
          chunk = [];
          i = 0;
        }
      }
      chunks.push(chunk);
      chunks.push(['_last_entry_']);
      jsonData['_last_entry_'] = true;

      var addChunk = function imedbAddChunk() {
        debug('Loading data chunk into IndexedDB, ' +
            (chunks.length - 1) + ' chunks remaining.');

        var transaction = iDB.transaction('terms', IDBTransaction.READ_WRITE);
        var store = transaction.objectStore('terms');

        transaction.onerror = function putError(ev) {
          debug('Problem while populating DB with JSON data.');
        };

        transaction.oncomplete = function putComplete() {
          if (chunks.length) {
            setTimeout(addChunk, 0);
          } else {
            jsonData = null;
            setTimeout(callback, 0);
          }
        };

        var syllables;
        var chunk = chunks.shift();
        for (i in chunk) {
          var syllables = chunk[i];
          store.put({
            syllables: syllables,
            terms: jsonData[syllables]
          });
        }
      };

      setTimeout(addChunk, 0);
    };

    var getTermsJSON = function imedb_getTermsJSON(callback) {
      getWordsJSON(function getWordsJSONCallback() {
        getPhrasesJSON(callback);
      });
    };

    var getWordsJSON = function imedb_getWordsJSON(callback) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', (settings.wordsJSON || './words.json'), true);
      try {
        xhr.responseType = 'json';
      } catch (e) { }
      xhr.overrideMimeType('application/json; charset=utf-8');
      xhr.onreadystatechange = function xhrReadystatechange(ev) {
        if (xhr.readyState !== 4)
          return;

        var response;
        if (xhr.responseType == 'json') {
          response = xhr.response;
        } else {
          try {
            response = JSON.parse(xhr.responseText);
          } catch (e) { }
        }

        if (typeof response !== 'object') {
          debug('Failed to load words.json: Malformed JSON');
          callback();
          return;
        }

        jsonData = {};
        // clone everything under response coz it's readonly.
        for (var s in response) {
          jsonData[s] = response[s];
        }
        xhr = null;

        callback();
      };

      xhr.send(null);
    };

    var getPhrasesJSON = function getPhrasesJSON(callback) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', (settings.phrasesJSON || './phrases.json'), true);
      try {
        xhr.responseType = 'json';
      } catch (e) { }
      xhr.overrideMimeType('application/json; charset=utf-8');
      xhr.onreadystatechange = function xhrReadystatechange(ev) {
        if (xhr.readyState !== 4)
          return;

        var response;
        if (xhr.responseType == 'json') {
          response = xhr.response;
        } else {
          try {
            response = JSON.parse(xhr.responseText);
          } catch (e) { }
        }

        if (typeof response !== 'object') {
          debug('Failed to load phrases.json: Malformed JSON');
          callback();
          return;
        }

        // clone everything under response coz it's readonly.
        for (var s in response) {
          jsonData[s] = response[s];
        }
        xhr = null;

        callback();
      };

      xhr.send(null);
    };

    /* ==== helper functions ==== */

    /*
    * Math function that return all possible compositions of
    * a given natural number
    * callback will be called 2^(n-1) times.
    *
    * ref: http://en.wikipedia.org/wiki/Composition_(number_theory)#Examples
    * also: http://stackoverflow.com/questions/8375439
    *
    */
    var compositionsOf = function imedb_compositionsOf(n, callback) {
      var x, a, j;
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
        callback.call(this, a);
      }
    };

    /*
    * Data from IndexedDB gets to kept in iDBCache for kCacheTimeout seconds
    */
    var cacheSetTimeout = function imedb_cacheSetTimeout() {
      debug('Set iDBCache timeout.');
      clearTimeout(cacheTimer);
      cacheTimer = setTimeout(function imedb_cacheTimeout() {
        debug('Empty iDBCache.');
        iDBCache = {};
      }, kCacheTimeout);
    };

    /* ==== init ==== */

    this.init = function imedb_init(options) {
      settings = options;

      var ready = function imedbReady() {
        debug('Ready.');
        if (settings.ready)
          settings.ready();
      };

      if (settings.disableIndexedDB) {
        debug('IndexedDB disabled; Downloading JSON ...');
        getTermsJSON(ready);
        return;
      }

      debug('Probing IndexedDB ...');
      getTermsInDB(function getTermsInDBCallback() {
        if (!iDB) {
          debug('IndexedDB not available; Downloading JSON ...');
          getTermsJSON(ready);
          return;
        }

        var transaction = iDB.transaction('terms');

        var req = transaction.objectStore('terms').get('_last_entry_');
        req.onsuccess = function getdbSuccess(ev) {
          if (ev.target.result !== undefined) {
            ready();
            return;
          }

          debug('IndexedDB is supported but empty; Downloading JSON ...');
          getTermsJSON(function getTermsInDBCallback() {
            if (!jsonData) {
              debug('JSON failed to download.');
              return;
            }

            debug(
              'JSON loaded,' +
              'IME is ready to use while inserting data into db ...'
            );
            ready();
            populateDBFromJSON(function getTermsInDBCallback() {
              debug('IndexedDB ready and switched to indexedDB backend.');
            });
          });
        };
      });
    };

    /* ==== uninit ==== */

    this.uninit = function imedb_uninit() {
      if (iDB)
        iDB.close();
      jsonData = null;
    };

    /* ==== db lookup functions ==== */

    this.getTerms = function imedb_getTerms(syllables, callback) {
      if (!jsonData && !iDB) {
        debug('Database not ready.');
        callback(false);
        return;
      }

      var syllablesStr = syllables.join('-').replace(/ /g , '');
      var asteriskSyllablesStr;
      if (syllablesStr.indexOf('*') !== -1)
        asteriskSyllablesStr = syllablesStr.substring(0, syllablesStr.indexOf('*'));

      debug('Get terms for ' + syllablesStr + '.');

      if (typeof iDBCache[syllablesStr] !== 'undefined') {
        debug('Found in iDBCache.');
        cacheSetTimeout();
        callback(iDBCache[syllablesStr]);
        return;
      }

      if (jsonData) {
        debug('Lookup in JSON.');
        if (!asteriskSyllablesStr) {
          callback(jsonData[syllablesStr] || false);
          return;
        }
        debug('Do range search in JSON data.');
        var result = [];
        var dash = /\-/g;
        // XXX: this is not efficient
        for (var s in jsonData) {
          if (s.length < asteriskSyllablesStr)
            continue;
          if (s.substr(0, asteriskSyllablesStr.length) !== asteriskSyllablesStr)
            continue;
          // TODO: filter result if asterisk is not at the very end
          if (s.substr(asteriskSyllablesStr.length).indexOf('-') !== -1)
            continue;
          result = result.concat(jsonData[s]);
        }
        result = result.sort(
          function sort_result(a, b) {
            return (b[1] - a[1]);
          }
        );
        cacheSetTimeout();
        iDBCache[syllablesStr] = result;
        if (result.length) {
          callback(result);
        } else {
          callback(false);
        }
        return;
      }

      debug('Lookup in IndexedDB.');
      var store = iDB.transaction('terms', IDBTransaction.READ_ONLY)
        .objectStore('terms');
      if (!asteriskSyllablesStr) {
        var req = store.get(syllablesStr);
        req.onerror = function getdbError(ev) {
          debug('Database read error.');
          callback(false);
        };

        req.onsuccess = function getdbSuccess(ev) {
          cacheSetTimeout();

          if (!ev.target.result) {
            iDBCache[syllablesStr] = false;
            callback(false);
            return;
          }

          iDBCache[syllablesStr] = ev.target.result.terms;
          callback(ev.target.result.terms);
        };
        return;
      }
      debug('Do range search in IndexedDB.');
      // XXX: this is extremely slow
      var req = store.openCursor(
        IDBKeyRange.lowerBound(asteriskSyllablesStr, false));
      req.onerror = function getdbError(ev) {
        debug('Database read error.');
        callback(false);
      };
      var result = [];
      req.onsuccess = function getdbSuccess(ev) {
        var cursor = ev.target.result;
        var outOfRange = cursor &&
          cursor.key.substr(0, asteriskSyllablesStr.length) !== asteriskSyllablesStr;
        if (cursor) {
          iDBCache[cursor.key] = cursor.value.terms;
        }
        if (!cursor || outOfRange) {
          result = result.sort(
            function sort_result(a, b) {
              return (b[1] - a[1]);
            }
          );
          cacheSetTimeout();
          iDBCache[syllablesStr] = result;
          if (result.length) {
            callback(result);
          } else {
            callback(false);
          }
          return;
        }
        // TODO: filter result if asterisk is not at the very end
        if (cursor.key.substr(asteriskSyllablesStr.length).indexOf('-') !== -1) {
          cursor.continue();
          return;
        }
        result = result.concat(cursor.value.terms);
        cursor.continue();
      };
    };

    this.getTermWithHighestScore =
    function imedb_getTermWithHighestScore(syllables, callback) {
      self.getTerms(syllables, function getTermsCallback(terms) {
        if (!terms) {
          callback(false);
          return;
        }
        callback(terms[0]);
      });
    }

    this.getSentences = function imedb_getSentences(syllables, callback) {
      var sentences = [];
      var n = 0;

      compositionsOf.call(
        this,
        syllables.length,
        /* This callback will be called 2^(n-1) times */
        function compositionsOfCallback(composition) {
          var str = [];
          var start = 0;
          var i = 0;

          var next = function composition_next() {
            var numOfWord = composition[i];
            if (composition.length === i)
              return finish();
            i++;
            self.getTermWithHighestScore(
              syllables.slice(start, start + numOfWord),
              function getTermWithHighestScoreCallback(term) {
                if (!term && numOfWord > 1)
                  return finish();
                if (!term) {
                  var syllable = syllables.slice(start, start + numOfWord).join('');
                  debug('Syllable ' + syllable + ' does not made up a word, insert symbol.');
                  term = [syllable.replace(/\*/g, ''), -7];
                }

                str.push(term);
                start += numOfWord;
                next();
              }
            );
          };

          var finish = function compositionFinish() {
            // complete; this composition does made up a sentence
            if (start === syllables.length)
              sentences.push(str);

            if (++n === (1 << (syllables.length - 1))) {
              cacheSetTimeout();

              sentences = sentences.sort(function sortSentences(a, b) {
                var scoreA = 0;

                a.forEach(function countScoreA(term) {
                  scoreA += term[1];
                });

                var scoreB = 0;
                b.forEach(function countScoreB(term) {
                  scoreB += term[1];
                });

                return (scoreB - scoreA);
              });

              callback(sentences);
            }
          };

          next();
        }
      );
    };
  };

  var jszhuyin = new IMEngine();

  // Expose JSZhuyin as an AMD module
  if (typeof define === 'function' && define.amd)
    define('jszhuyin', [], function() { return jszhuyin; });

  // Expose to IMEManager if we are in Gaia homescreen
  if (typeof IMEManager !== 'undefined')
    IMEManager.IMEngines.jszhuyin = jszhuyin;

})();
