/* ***** BEGIN LICENSE BLOCK *****
* Version: MPL 1.1/GPL 2.0/LGPL 2.1
*
* The contents of this file are subject to the Mozilla Public License Version
* 1.1 (the "License"); you may not use this file except in compliance with
* the License. You may obtain a copy of the License at
* http://www.mozilla.org/MPL/
*
* Software distributed under the License is distributed on an "AS IS" basis,
* WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
* for the specific language governing rights and limitations under the
* License.
*
* The Original Code is JSZhuYing.
*
* The Initial Developer of the Original Code is
* the Mozila Foundation
* Portions created by the Initial Developer are Copyright (C) 2011
* the Initial Developer. All Rights Reserved.
*
* Contributor(s):
* Tim Guan-tin Chien <timdream@gmail.com>
*
* Alternatively, the contents of this file may be used under the terms of
* either the GNU General Public License Version 2 or later (the "GPL"), or
* the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
* in which case the provisions of the GPL or the LGPL are applicable instead
* of those above. If you wish to allow use of your version of this file only
* under the terms of either the GPL or the LGPL, and not to allow others to
* use your version of this file under the terms of the MPL, indicate your
* decision by deleting the provisions above and replace them with the notice
* and other provisions required by the GPL or the LGPL. If you do not delete
* the provisions above, a recipient may use your version of this file under
* the terms of any one of the MPL, the GPL or the LGPL.
*
* ***** END LICENSE BLOCK ***** */

'use stricts';

// Code for IMEngines to register itself

IMEManager.IMEngines.jszhuying = {
  dbName: 'JSZhuYing',
  dbVersion: 4,
  init: function (path, sendChoices, sendKey, sendString) {
    this.mobi = JSZhuYing.Mobi(
      {
        sendChoices: sendChoices,
        sendKey: sendKey,
        sendString: sendString,
        dbOptions: {
          //disableIndexedDB: true, // For now
          data: path + '/data.json'
        }
      }
    );
  },
  click: function (keyCode) {
    this.mobi.keypress(keyCode);
  },
  select: function (selection, selectionData) {
    this.mobi.select(selection, selectionData);
  },
  empty: function () {
    this.mobi.empty();
  }
};

// XXX: Should _not_ pollute global scope of homescreen.html
// IMEs should be a isolated keyboard application someday.

var JSZhuYing = function (settings) {
  settings = settings || {};
  if (typeof settings.progress !== 'function') settings.progress = function () {};
  if (typeof settings.ready !== 'function') settings.ready = function () {};

  var debugging = false,
  debug = function (str) {
    if (debugging)
      dump(str + '\n');
  },
  version = '0.1',
  dbName = 'JSZhuYing',
  jsonData,
  cache = {},
  cacheTimer,
  db,
  init = function () {
    var that = this;
    if (settings.disableIndexedDB) {
      settings.progress.call(that, 'IndexedDB disabled; Downloading JSON ...');
      debug('JSZhuYing: IndexedDB disabled; Downloading JSON ...');
      getTermsJSON(
        function () {
          settings.ready.call(that);
        }
      );
      return;
    }
    settings.progress.call(that, 'Probing IndexedDB ...');
    debug('JSZhuYing: Probing IndexedDB ...');
    getTermsInDB(
      function () {
        if (!db) {
          settings.progress.call(that, 'IndexedDB not available; Downloading JSON ...');
          debug('JSZhuYing: IndexedDB not available; Downloading JSON ...');
          getTermsJSON(
            function () {
              settings.ready.call(that);
              debug('JSZhuYing: Ready.');
            }
          );
          return;
        }
        var transaction = db.transaction('terms'),
        req = transaction.objectStore('terms').count();
        req.onsuccess = function (ev) {
          if (req.result !== 0) {
            settings.ready.call(that);
            return;
          }
          settings.progress.call(that, 'IndexedDB is supported but empty; Downloading JSON ...');
          debug('JSZhuYing: IndexedDB is supported but empty; Downloading JSON ...');
          getTermsJSON(
            function () {
              if (!jsonData) return;
              settings.ready.call(that);
              settings.progress.call(that, 'JSON downloaded, IME is ready to use while inserting data into db ...');
              debug('JSZhuYing: JSON downloaded, IME is ready to use while inserting data into db ...');
              populateDBFromJSON(
                function () {
                  settings.progress.call(that, 'indexedDB ready and switched to indexedDB backend.');
                  debug('JSZhuYing: indexedDB ready and switched to indexedDB backend.');
                }
              );
            }
          );
        }
      }
    );
  },
  getTermsInDB = function (callback) {
    if (!window.mozIndexedDB || window.location.protocol === 'file:') {
      callback();
      return;
    }
    var req = mozIndexedDB.open(dbName, 4, 'JSZhuYing db');
    req.onerror = function () {
      debug('JSZhuYing: Problem while opening indexedDB.');
      callback();
    };
    req.onupgradeneeded = function (ev) {
      debug('JSZhuYing: IndexedDB upgradeneeded.');
      db = req.result;
      if (db.objectStoreNames.length !== 0) db.deleteObjectStore('terms');
      var store = db.createObjectStore(
        'terms',
        {
          keyPath: 'syllables'
        }
      );
    };
    req.onsuccess = function () {
      debug('JSZhuYing: IndexedDB opened.');
      db = req.result;
      callback();
    };
  },
  populateDBFromJSON = function (callback) {
    var transaction = db.transaction('terms', IDBTransaction.READ_WRITE),
    store = transaction.objectStore('terms');

    transaction.onerror = function () {
      debug('JSZhuYing: Problem while populating DB with JSON data.');
    };
    transaction.oncomplete = function () {
      jsonData = null;
      delete jsonData;
      callback();
    };

    for (syllables in jsonData) {
      store.add(
        {
          syllables: syllables,
          terms: jsonData[syllables]
        }
      );
    }
  },
  getTermsJSON = function (callback) {
    // Get data.json.js
    // this is the database we need to get terms against.
    // the JSON is converted from tsi.src and phone.cin in Chewing source code.
    // https://github.com/chewing/libchewing/blob/master/data/tsi.src
    // https://github.com/chewing/libchewing/blob/master/data/phone.cin

    var xhr = new XMLHttpRequest();
    xhr.open(
      'GET',
      settings.data || './data.json.js',
      true
    );
    xhr.onreadystatechange = function (ev) {
      if (xhr.readyState !== 4) return;
      try {
        jsonData = JSON.parse(xhr.responseText);
      } catch (e) {}
      if (!jsonData) {
        debug('JSZhuYing: JSON data failed to load.');
      }
      xhr.responseText = null;
      delete xhr;

      callback();
    };
    xhr.send(null);

  },
  /*
  * Math function that return all possibile compositions of a given natural number
  * callback will be called 2^(n-1) times.
  *
  * ref: http://en.wikipedia.org/wiki/Composition_(number_theory)#Examples
  * also: http://stackoverflow.com/questions/8375439
  */
  compositionsOf = function (n, callback) {
    var x, a, j;
    x = 1 << n-1;
    while (x--) {
      a = [1];
      j = 0;
      while (n-1 > j) {
        if (x & (1 << j)) {
          a[a.length-1]++;
        } else {
          a.push(1);
        }
        j++;
      }
      callback.call(this, a);
    }
  },
  /*
  * With series of syllables, return an array of possible sentences
  *
  */
  getSentences = function (syllables, callback) {
    var sentences = [], n = 0;
    compositionsOf.call(
      this,
      syllables.length,
      /* This callback will be called 2^(n-1) times */
      function (composition) {
        var str = [], score = 0, start = 0, i = 0,
        next = function () {
          var numOfWord = composition[i];
          if (composition.length === i) return finish();
          i++;
          getTermWithHighestScore(
            syllables.slice(start, start + numOfWord),
            function (term) {
              if (!term) return finish();
              str.push(term);
              start += numOfWord;
              next();
            }
          );
        },
        finish = function () {
          if (start === syllables.length) sentences.push(str); // complete; this composition does made up a sentence
          n++;
          if (n === (1 << (syllables.length - 1))) {
            cleanCache();
            callback(sentences);
          }
        };
        next();
      }
    );
  },
  /*
  * With series of syllables, return the sentence with highest score
  *
  */
  getSentenceWithHighestScore = function (syllables, callback) {
    var theSentence, theScore = -1;
    return getSentences(
      syllables,
      function (sentences) {
        if (!sentences) return callback(false);
        sentences.forEach(
          function (sentence) {
            var score = 0;
            sentence.forEach(
              function (term) {
                if (term[0].length === 1) score += term[1] / 512; // magic number from rule_largest_freqsum() in libchewing/src/tree.c
                else score += term[1];
              }
            );
            if (score >= theScore) {
              theSentence = sentence;
              theScore = score;
            }
          }
        );
        return callback(theSentence);
      }
    );

  },
  /*
  * Simple query function that return an array of objects representing all possible terms
  *
  */
  getTerms = function (syllables, callback) {
    if (!jsonData && !db) {
      debug('JSZhuYing: database not ready.');
      return callback(false);
    }
    if (jsonData)
      return callback(jsonData[syllables.join('')] || false);
    if (typeof cache[syllables.join('')] !== 'undefined')
      return callback(cache[syllables.join('')]);
    var req = db.transaction('terms'/*, IDBTransaction.READ_ONLY */).objectStore('terms').get(syllables.join(''));
    req.onerror = function () {
      debug('JSZhuYing: database read error.');
      return callback(false);
    };
    return req.onsuccess = function (ev) {
      cleanCache();
      if (ev.target.result) {
        cache[syllables.join('')] = ev.target.result.terms;
        return callback(ev.target.result.terms);
      } else {
        cache[syllables.join('')] = false;
        return callback(false);
      }
    };
  },
  /*
  * Return the term with the highest score
  *
  */
  getTermWithHighestScore = function (syllables, callback) {
    return getTerms(
      syllables,
      function (terms) {
        var theTerm = ['', -1];
        if (!terms) return callback(false);
        terms.forEach(
          function (term) {
            if (term[1] > theTerm[1]) {
              theTerm = term;
            }
          }
        );
        if (theTerm[1] !== -1) return callback(theTerm);
        else return callback(false);
      }
    );
  },
  cleanCache = function () {
    clearTimeout(cacheTimer);
    cacheTimer = setTimeout(
      function () {
        cache = {};
      },
      4000
    );
  };

  init.call(this);

  return {
    version: version,
    getSentences: getSentences,
    getSentenceWithHighestScore: getSentenceWithHighestScore,
    getTerms: getTerms,
    getTermWithHighestScore: getTermWithHighestScore
  };
};

/*
*  Mobile-style interaction front-end for JSZhuying
*
*/

'use stricts';

if (!JSZhuYing) {
  debug('JSZhuYing: front-end script should load *after* the main script.');
  var JSZhuYing = {};
}

JSZhuYing.Mobi = function (settings) {
  /* const */var symbolType = {
    "ㄅ":"consonant","ㄆ":"consonant","ㄇ":"consonant","ㄈ":"consonant","ㄉ":"consonant","ㄊ":"consonant","ㄋ":"consonant","ㄌ":"consonant","ㄍ":"consonant","ㄎ":"consonant","ㄏ":"consonant","ㄐ":"consonant","ㄑ":"consonant","ㄒ":"consonant","ㄓ":"consonant","ㄔ":"consonant","ㄕ":"consonant","ㄖ":"consonant","ㄗ":"consonant","ㄘ":"consonant","ㄙ":"consonant",
    "ㄧ":"vowel1","ㄨ":"vowel1","ㄩ":"vowel1",
    "ㄚ":"vowel2","ㄛ":"vowel2","ㄜ":"vowel2","ㄝ":"vowel2","ㄞ":"vowel2","ㄟ":"vowel2","ㄠ":"vowel2","ㄡ":"vowel2","ㄢ":"vowel2","ㄣ":"vowel2","ㄤ":"vowel2","ㄥ":"vowel2","ㄦ":"vowel2",
    " ":"tone","˙":"tone","ˊ":"tone","ˇ":"tone","ˋ":"tone"
  },
  symbolPlace = {
    "consonant":0,
    "vowel1":1,
    "vowel2":2,
    "tone":3
  },
  getChoices = function (syllables, type, callback) {
    var choices = [];
    switch (type) {
      case 'sentence':
        jszhuying.getSentences(
          syllables,
          function (sentences) {
            if (!sentences) return callback([]);
            sentences.forEach(
              function (sentence) {
                var str = '';
                sentence.forEach(
                  function (term) {
                    str += term[0];
                  }
                );
                if (choices.indexOf(str) === -1) choices.push(str);
              }
            );
            callback(choices);
          }
        );
      break;
      case 'term':
        jszhuying.getTerms(
          syllables,
          function (terms) {
            if (!terms) return callback([]);
            terms.forEach(
              function (term) {
                choices.push(term[0]);
              }
            );
            callback(choices);
          }
        );
      break;
    }
  },
  empty = function () {
    syllablesInBuffer = [''];
    pendingSyllable = ['','','',''];
    firstChoice = '';
  },
  queue = function (code) {
    keypressQueue.push(code);
    if (!isWorking) {
      isWorking = true;
      next();
    }
  },
  select = function (text) {
    settings.sendString(text);
    var i = text.length;
    while (i--) {
      syllablesInBuffer.shift();
    }
    if (!syllablesInBuffer.length) {
      syllablesInBuffer = [''];
      pendingSyllable = ['','','',''];
    }
    findChoices(function () {});
  },
  next = function () {
    if (!keypressQueue.length) {
      isWorking = false;
      return;
    }
    keypressed(
      keypressQueue.shift(),
      next
    );
  },
  findChoices = function (callback) {
    var allChoices = [], syllablesForQuery = [].concat(syllablesInBuffer);
    if (pendingSyllable[3] === '' && syllablesForQuery[syllablesForQuery.length - 1]) {
      syllablesForQuery[syllablesForQuery.length - 1] = pendingSyllable.join('') + ' ';
    }
    if (!syllablesInBuffer.join('').length) {
      settings.sendChoices(allChoices);
      firstChoice = '';
      return callback();
    }
    getChoices(
      syllablesForQuery,
      'term',
      function (choices) {
        choices.forEach(
          function (choice) {
            allChoices.push([choice, 'whole']);
          }
        );
        if (syllablesInBuffer.length === 1 && allChoices.length) {
          settings.sendChoices(allChoices);
          firstChoice = allChoices[0][0];
          return callback();
        } else if (syllablesInBuffer.length === 1) {
          allChoices.push([syllablesInBuffer.join(''), 'whole']);
          settings.sendChoices(allChoices);
          firstChoice = allChoices[0][0];
          return callback();
        }
        getChoices(
          syllablesForQuery,
          'sentence',
          function (choices) {
            choices.forEach(
              function (choice) {
                if (!allChoices.some(
                  function (availChoice) {
                    return (availChoice[0] === choice);
                  }
                )) {
                  allChoices.push([choice, 'whole']);
                }
              }
            );

            if (!allChoices.length) allChoices.push([syllablesInBuffer.join(''), 'whole']);
            firstChoice = allChoices[0][0];

            var i = Math.min(8, syllablesInBuffer.length - 1),
            findTerms = function () {
              getChoices(
                syllablesForQuery.slice(0, i),
                'term',
                function (choices) {
                  choices.forEach(
                    function (choice) {
                      allChoices.push([choice, 'term']);
                    }
                  );
                  i--;
                  if (i) findTerms();
                  else {
                    settings.sendChoices(allChoices);
                    return callback();
                  }
                }
              );
            };
            findTerms();
          }
        );
      }
    );
  },
  keypressed = function (code, callback) {
    if (code === 13) { // enter
      if (
        syllablesInBuffer.length === 1
        && syllablesInBuffer[0] === ''
      ) {
        settings.sendKey(13); // default action
        return callback();
      }
      settings.sendString(firstChoice);
      settings.sendChoices([]);
      syllablesInBuffer = [''];
      pendingSyllable = ['','','',''];
      return callback();
    }

    if (code === 8) { // backspace
      if (
        syllablesInBuffer.length === 1
        && syllablesInBuffer[0] === ''
      ) {
        settings.sendKey(8); // default action
        return callback();
      }
      if (
        !pendingSyllable.some(function (s) { return !!s; })
      ) {
        syllablesInBuffer = syllablesInBuffer.slice(0, syllablesInBuffer.length-1);
        syllablesInBuffer[syllablesInBuffer.length-1] = pendingSyllable.join('');
        return findChoices(callback);
      }
      pendingSyllable = ['','','',''];
      syllablesInBuffer[syllablesInBuffer.length-1] = pendingSyllable.join('');
      return findChoices(callback);
    }

    var symbol = String.fromCharCode(code);
    if (!symbolType[symbol]) return callback();

    pendingSyllable[symbolPlace[symbolType[symbol]]] = symbol;

    syllablesInBuffer[syllablesInBuffer.length-1] = pendingSyllable.join('');

    if (
      symbolType[symbol] === 'tone'
      && syllablesInBuffer.length >= (settings.bufferLimit || 10)
    ) {
      var i = syllablesInBuffer.length - 1,
      findTerms = function () {
        getChoices(
          syllablesInBuffer.slice(0, i),
          'term',
          function (choices) {
            if (choices[0] || i === 1) {
              settings.sendString(
                choices[0] || syllablesInBuffer.slice(0, i).join('')
              );
              while (i--) {
                syllablesInBuffer.shift();
              }
              if (!syllablesInBuffer.length) {
                syllablesInBuffer = [''];
                pendingSyllable = ['','','',''];
              }
              return findChoices(
                function () {
                  if (symbolType[symbol] === 'tone') {
                    // start syllables for next character
                    syllablesInBuffer.push('');
                    pendingSyllable = ['','','',''];
                  }
                  return callback();
                }
              );
            }
            i--;
            return findTerms();
          }
        );
      };
      return findTerms();
    }

    findChoices(
      function () {
        if (symbolType[symbol] === 'tone') {
          // start syllables for next character
          syllablesInBuffer.push('');
          pendingSyllable = ['','','',''];
        }
        callback();
      }
    );
  };

  var syllablesInBuffer = [''],
  pendingSyllable = ['','','',''],
  firstChoice = '',
  keypressQueue = [],
  isWorking = false,
  jszhuying = JSZhuYing(settings.dbOptions);

  if (!settings) settings = {};
  ['sendString', 'sendChoices', 'sendKey'].forEach(
    function (functionName) {
      if (!settings[functionName]) settings[functionName] = function () {};
    }
  );

  return {
    keypress: queue,
    select: select,
    empty: empty
  }

};
