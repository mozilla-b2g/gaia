/*global InputMethodDatabaseLoader, WordListConverter, InputMethods, dump */
'use strict';

require('/test/unit/setup_engine.js');
require('/js/imes/latin/latin.js');

require('/js/settings/word_list_converter.js');
require('/js/keyboard/input_method_database_loader.js');

suite('Latin worker', function() {
  var worker;
  var keymaps = {};

  suiteSetup(function() {
    worker = new Worker('../../../../js/imes/latin/worker.js');

    keymaps.qwerty = InputMethods.latin.generateNearbyKeyMap({
      'keyboardWidth': 320,
      'keyboardHeight': 205,
      'keyArray': [{
        'code': 113,
        'x': 0,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 119,
        'x': 32,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 101,
        'x': 64,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 114,
        'x': 96,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 116,
        'x': 128,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 121,
        'x': 160,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 117,
        'x': 192,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 105,
        'x': 224,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 111,
        'x': 256,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 112,
        'x': 288,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 97,
        'x': 16,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 115,
        'x': 48,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 100,
        'x': 80,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 102,
        'x': 112,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 103,
        'x': 144,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 104,
        'x': 176,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 106,
        'x': 208,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 107,
        'x': 240,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 108,
        'x': 272,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 20,
        'x': 0,
        'y': 131,
        'width': 48,
        'height': 43
      }, {
        'code': 122,
        'x': 48,
        'y': 131,
        'width': 32,
        'height': 43
      }, {
        'code': 120,
        'x': 80,
        'y': 131,
        'width': 32,
        'height': 43
      }, {
        'code': 99,
        'x': 112,
        'y': 131,
        'width': 32,
        'height': 43
      }, {
        'code': 118,
        'x': 144,
        'y': 131,
        'width': 32,
        'height': 43
      }, {
        'code': 98,
        'x': 176,
        'y': 131,
        'width': 32,
        'height': 43
      }, {
        'code': 110,
        'x': 208,
        'y': 131,
        'width': 32,
        'height': 43
      }, {
        'code': 109,
        'x': 240,
        'y': 131,
        'width': 32,
        'height': 43
      }, {
        'code': 8,
        'x': 272,
        'y': 131,
        'width': 48,
        'height': 43
      }, {
        'code': 65534,
        'x': 0,
        'y': 182,
        'width': 48,
        'height': 43
      }, {
        'code': 65533,
        'x': 48,
        'y': 182,
        'width': 32,
        'height': 43
      }, {
        'code': 32,
        'x': 80,
        'y': 182,
        'width': 144,
        'height': 43
      }, {
        'code': 46,
        'x': 224,
        'y': 182,
        'width': 32,
        'height': 43
      }, {
        'code': 13,
        'x': 256,
        'y': 182,
        'width': 64,
        'height': 43
      }],
      'keyWidth': 32,
      'keyHeight': 50
    });

    keymaps.azerty = InputMethods.latin.generateNearbyKeyMap({
      'keyboardWidth': 320,
      'keyboardHeight': 205,
      'keyArray': [{
        'code': 97,
        'x': 0,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 122,
        'x': 32,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 101,
        'x': 64,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 114,
        'x': 96,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 116,
        'x': 128,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 121,
        'x': 160,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 117,
        'x': 192,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 105,
        'x': 224,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 111,
        'x': 256,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 112,
        'x': 288,
        'y': 29,
        'width': 32,
        'height': 43
      }, {
        'code': 113,
        'x': 0,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 115,
        'x': 32,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 100,
        'x': 64,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 102,
        'x': 96,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 103,
        'x': 128,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 104,
        'x': 160,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 106,
        'x': 192,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 107,
        'x': 224,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 108,
        'x': 256,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 109,
        'x': 288,
        'y': 80,
        'width': 32,
        'height': 43
      }, {
        'code': 20,
        'x': 0,
        'y': 131,
        'width': 48,
        'height': 43
      }, {
        'code': 119,
        'x': 48,
        'y': 131,
        'width': 32,
        'height': 43
      }, {
        'code': 120,
        'x': 80,
        'y': 131,
        'width': 32,
        'height': 43
      }, {
        'code': 99,
        'x': 112,
        'y': 131,
        'width': 32,
        'height': 43
      }, {
        'code': 118,
        'x': 144,
        'y': 131,
        'width': 32,
        'height': 43
      }, {
        'code': 98,
        'x': 176,
        'y': 131,
        'width': 32,
        'height': 43
      }, {
        'code': 110,
        'x': 208,
        'y': 131,
        'width': 32,
        'height': 43
      }, {
        'code': 39,
        'x': 240,
        'y': 131,
        'width': 32,
        'height': 43
      }, {
        'code': 8,
        'x': 272,
        'y': 131,
        'width': 48,
        'height': 43
      }, {
        'code': 18,
        'x': 0,
        'y': 182,
        'width': 64,
        'height': 43
      }, {
        'code': -3,
        'x': 64,
        'y': 182,
        'width': 32,
        'height': 43
      }, {
        'code': 32,
        'x': 96,
        'y': 182,
        'width': 128,
        'height': 43
      }, {
        'code': 46,
        'x': 224,
        'y': 182,
        'width': 32,
        'height': 43
      }, {
        'code': 13,
        'x': 256,
        'y': 182,
        'width': 64,
        'height': 43
      }],
      'keyWidth': 32,
      'keyHeight': 51
    });
  });

  setup(function() {
    worker.onmessage = sinon.stub();
  });

  test('Worker should throw if language doesnt exist', function(next) {
    worker.postMessage({ cmd: 'setLanguage', args: ['no-existente'] });
    onWorkerMessage(function(data) {

      assert.equal(data.cmd, 'error');
      next();
    });
  });

  function onWorkerMessage(filter, callback) {
    if (typeof filter === 'function') {
      callback = filter;
      filter = undefined;
    }
    var occ = worker.onmessage.callCount;
    var iv = setInterval(function() {
      if (worker.onmessage.callCount > occ) {
        var ev = worker.onmessage.args[worker.onmessage.callCount - 1][0];
        // console.log(ev.data);

        occ = worker.onmessage.callCount;

        if (filter !== undefined && ev.data.cmd !== filter) {
          return;
        }

        clearInterval(iv);
        callback(ev.data);
      }
    }, 20);
  }

  function prediction(input, expected, next) {
    worker.postMessage({cmd: 'predict', args: [input]});

    onWorkerMessage('predictions', function(data) {

      var suggestions = data.suggestions;

      assert.equal(data.cmd, 'predictions');
      assert.equal(data.input, input);

      suggestions = suggestions.map(function(s) {
        return s[0];
      });

      assert.equal(suggestions[0], expected[0]);

      for (var i = 1; i < 6; i++) {
        if (expected[i] !== null) {
          assert.equal(suggestions[i], expected[i], 'index: ' + i);
        }
      }

      next();
    });
  }

  function setupLanguage(langCode, keymap, userDictBlob, next) {
    var loader = new InputMethodDatabaseLoader();
    loader.start();
    loader.SOURCE_DIR = '/js/imes/';
    loader.load('latin', 'dictionaries/' + langCode + '.dict')
    .then(function(dictData) {
      worker.postMessage({
        cmd: 'setLanguage',
        args: [langCode, dictData, userDictBlob]
      }, [dictData]);
    })['catch'](function(e) { // workaround gjlsint error
      console.error(e.toString());
    });

    worker.postMessage({
      cmd: 'setNearbyKeys',
      args: [keymap]
    });

    var successCount = 0;
    worker.onmessage = function(e) {
      if (e.data.cmd !== 'success') {
        dump('worker.onmessage unexpected result ' + e.message + '\n');
      }

      assert.equal(e.data.cmd, 'success');

      if (e.data.fn.startsWith('setLanguage') ||
          e.data.fn.startsWith('setNearbyKeys')) {
        successCount++;

        if (successCount === 4) {
          next();
        }
      }
    };
  }

  suite('en_us predictions', function() {
    suiteSetup(function(next) {
      setupLanguage('en_us', keymaps.qwerty, undefined, next);
    });

    test('i should be predicted as I', function(next) {
      prediction('i', ['I', 'in', 'is', null, null, null], next);
    });

    test('Capital input should give capital output', function(next) {
      prediction('City', ['City', 'City\'s', 'Fit', null, null, null], next);
    });

    test('Non-Capital input should give non-capital output', function(next) {
      prediction('city', ['city', 'city\'s', 'fit', null, null, null], next);
    });

    test('Non existing word should not be matched', function(next) {
      prediction('sadjasuufehwuefhwejfd', [undefined, null, null, null], next);
    });

    test('$ should not yield autosuggest', function(next) {
      prediction('$', [undefined, null, null, null], next);
    });

    suite('Capitalization and suggestions', function() {
      test('virgule', function(next) {
        prediction('virgule',
          ['virgule', 'virgules', 'Virgil', null, null, null], next);
      });

      test('Virgule', function(next) {
        prediction('Virgule',
          ['Virgule', 'Virgules', 'Virgil', null, null, null], next);
      });

      test('virgul', function(next) {
        prediction('virgul',
          ['Virgil', 'Virgil\'s', 'virgule', null, null, null], next);
      });

      test('Virgul', function(next) {
        prediction('Virgul',
          ['Virgil', 'Virgil\'s', 'Virgule', null, null, null], next);
      });

      test('balds', function(next) {
        prediction('balds',
          ['balds', 'Baldwin', 'Baldwins', null, null, null], next);
      });

      test('Balds', function(next) {
        prediction('Balds',
          ['Balds', 'Baldwin', 'Baldwins', null, null, null], next);
      });

      test('chaot', function(next) {
        prediction('chaot',
          ['chaotic', 'chapter', 'chapters', null, null, null], next);
      });

      test('Chaot', function(next) {
        prediction('Chaot',
          ['Chaotic', 'Chapter', 'Chapters', null, null, null], next);
      });

      test('as', function(next) {
        prediction('as', ['as', 'ad', 'AD', null, null, null], next);
      });

      test('As', function(next) {
        prediction('As', ['As', 'Ad', 'AD', null, null, null], next);
      });

      test('keyboa', function(next) {
        prediction('keyboa', ['keyboard', null, null, null, null, null], next);
      });
    });

    suite('Low frequency dictionary words with better suggestion', function() {
      test('wont', function(next) {
        prediction('wont', ['won\'t', 'wont', 'Wong', null, null, null], next);
      });

      test('cant', function(next) {
        prediction('cant', ['can\'t', 'cant', 'canto', null, null, null], next);
      });
    });

    suite('Swear words', function() {
      test('Should not suggest word in offensive list #1', function(next) {
        worker.postMessage({ cmd: 'predict', args: ['fuc'] });

        onWorkerMessage(function() {
          var suggestions = worker.onmessage.args[0][0].data.suggestions;

          assert.notEqual(suggestions[0][0], 'fuck');
          assert.notEqual(suggestions[1][0], 'fuck');
          assert.notEqual(suggestions[2][0], 'fuck');

          next();
        });
      });

      test('Should not suggest word in offensive list #2', function(next) {
        worker.postMessage({ cmd: 'predict', args: ['peni'] });

        onWorkerMessage(function() {
          var suggestions = worker.onmessage.args[0][0].data.suggestions;

          assert.notEqual(suggestions[0][0], 'penis');
          assert.notEqual(suggestions[1][0], 'penis');
          assert.notEqual(suggestions[2][0], 'penis');

          next();
        });
      });

      test('Should not suggest word in offensive list #3', function(next) {
        worker.postMessage({ cmd: 'predict', args: ['fuck'] });

        onWorkerMessage(function(data) {
          var suggestions = data.suggestions;

          assert.equal(suggestions[1][0], 'duck');
          assert.equal(suggestions[2][0], 'Tuck');

          next();
        });
      });

      test('Should suggest offensive word if matches input #1', function(next) {
        prediction('fuck', ['fuck', null, null, null, null, null], next);
      });

      test('Should suggest offensive word if matches input #2', function(next) {
        prediction('penis', ['penis', null, null, null, null, null], next);
      });

      test('Should suggest offensive word if matches input #3', function(next) {
        prediction('Penis', ['Penis', null, null, null, null, null], next);
      });

      test('Should suggest offensive word if matches input #4', function(next) {
        prediction('Vagina', ['Vagina', null, null, null, null, null], next);
      });

      test('Should suggest offensive word if matches input #5', function(next) {
        prediction('Fuck', ['Fuck', null, null, null, null, null], next);
      });

      test('Should suggest offensive word if matches input #6', function(next) {
        prediction('shit', ['shit', null, null, null, null, null], next);
      });

      test('Should suggest offensive word if matches input #7', function(next) {
        prediction('prick', ['prick', null, null, null, null, null], next);
      });

      test('Should suggest offensive word if matches input #7', function(next) {
        prediction('ass', ['ass', null, null, null, null, null], next);
      });
    });

    suite('Vertical nearby keys', function() {
      test('Asjan / Asian', function(next) {
        prediction('Asjan', ['Asian', null, null, null, null, null], next);
      });

      test('flr / for', function(next) {
        prediction('flr', ['for', null, null, null, null, null], next);
      });

      test('kn / km / in / on', function(next) {
        prediction('kn', ['km', 'in', 'on', null, null, null], next);
      });
    });
  });

  // a bit "cheating" here: if we use en_us in this suite then setLanguage will
  // early-return at setting built-in dict and "success" count will only be 3.
  // to avoid changing too many assertion logics we'll use en_gb and en_us
  // alternately.
  suite('predictions in conjuction with user dictionary', function() {
    var blob;
    suiteSetup(function() {
      blob = new WordListConverter(
        ['Mozilla', 'MozSpace', 'MozTrap', 'mozSettings', 'Mozillian'])
        .toBlob();
    });

    suite('with user dictionary blob at setupLanguage', function() {
      suiteSetup(function(next) {
        setupLanguage('en_gb', keymaps.qwerty, blob, next);
      });

      test('Moz', function(next) {
        prediction('Moz',
          ['Mox', 'Mos', 'Most', 'Mod', 'MozTrap', 'Mozilla'], next);
      });

      test('mozs', function(next) {
        prediction('mozs',
          ['moss', 'mods', 'mossy', 'Mossi', 'MozSpace', 'MozTrap'], next);
      });
    });

    suite('with user dictionary blob supplied later', function() {
      suiteSetup(function(next) {
        setupLanguage('en_us', keymaps.qwerty, undefined, function() {
          worker.addEventListener('message', function onMessage(e) {
            if ('success' === e.data.cmd && 'setUserDictionary' === e.data.fn) {
              worker.removeEventListener('messgae', onMessage);
              next();
            }
          });
          worker.postMessage({
            cmd: 'setUserDictionary',
            args: [blob]
          });
        });
      });

      test('Moz', function(next) {
        prediction('Moz',
          ['MOX', 'Mos', 'Most', 'Mod', 'MozTrap', 'Mozilla'], next);
      });

      test('mozs', function(next) {
        prediction('mozs',
          ['moss', 'Moss', 'mods', 'mossy', 'MozSpace', 'MozTrap'], next);
      });
    });


    suite('with user dictionary blob nullified later', function() {
      suiteSetup(function(next) {
        setupLanguage('en_gb', keymaps.qwerty, blob, function() {
          worker.addEventListener('message', function onMessage(e) {
            if ('success' === e.data.cmd && 'setUserDictionary' === e.data.fn) {
              worker.removeEventListener('messgae', onMessage);
              next();
            }
          });
          worker.postMessage({
            cmd: 'setUserDictionary',
            args: [undefined]
          });
        });
      });

      // do not append "null" there: we want to make sure the suggestions cut at
      // the fourth element.
      test('Moz', function(next) {
        prediction('Moz', ['Mox', 'Mos', 'Most', 'Mod'], next);
      });

      test('mozs', function(next) {
        prediction('mozs', ['moss', 'mods', 'mossy', 'Mossi'], next);
      });
    });
  });

  suite('fr predictions', function() {
    suiteSetup(function(next) {
      setupLanguage('fr', keymaps.azerty, undefined, next);
    });

    test('123 should not yield prediction', function(next) {
      prediction('123', [null, null, null, null, null, null], next);
    });
  });

  suite('validChars() is tolerant on small dicts', function() {
    suiteSetup(function(next) {
      var dictData = new WordListConverter(['Ápple']).toBlob();

      worker.postMessage({
        cmd: 'setNearbyKeys',
        args: [keymaps.qwerty]
      });

      worker.postMessage({
        cmd: 'setLanguage',
        args: ['en_us', dictData]
      });

      var successCount = 0;
      worker.onmessage = function(e) {
        if (e.data.cmd !== 'success') {
          dump('worker.onmessage unexpected result ' + e.message + '\n');
        }
        assert.equal(e.data.cmd, 'success');

        if (e.data.fn.startsWith('setLanguage') ||
            e.data.fn.startsWith('setNearbyKeys')) {
          successCount++;

          if (successCount === 2) {
            next();
          }
        }
      };
    });

    test('app should yield prediction', function(next) {
      prediction('app', ['Ápple', null, null], next);
    });
  });
});
