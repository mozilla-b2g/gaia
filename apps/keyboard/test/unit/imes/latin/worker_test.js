/*global InputMethodDatabaseLoader, WordListConverter, InputMethods, dump */
'use strict';

require('/js/settings/word_list_converter.js');
require('/js/keyboard/input_method_database_loader.js');

suite('Latin worker', function() {
  var worker;
  var keymaps = {};

  suiteSetup(function(done) {
    window.InputMethods = {};
    require('/js/imes/latin/latin.js', function() {
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

      done();
    });
  });

  setup(function() {
    worker = new Worker('../../../../js/imes/latin/worker.js');
  });

  teardown(function() {
    worker.terminate();
    worker.onmessage = null;
    worker = null;
  });

  function onWorkerMessage(filter) {
    return new Promise(function(resolve,reject) {
      worker.onmessage = function handleWorkerMessage(evt) {
        if (filter !== undefined && evt.data.cmd !== filter) {
          return;
        }

        worker.onmessage = null;
        resolve(evt.data);
      };
    });
  }

  function prediction(input, expected) {
    worker.postMessage({cmd: 'predict', args: [input]});

    return onWorkerMessage('predictions').then(function(data) {

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
    });
  }

  function setupLanguage(langCode, keymap, userDictBlob) {
    var loader = new InputMethodDatabaseLoader();
    loader.start();
    loader.SOURCE_DIR = '/js/imes/';
    var loaderPromise =
      loader.load('latin', 'dictionaries/' + langCode + '.dict')
      .then(function(dictData) {
        worker.postMessage({
          cmd: 'setLanguage',
          args: [langCode, dictData, userDictBlob]
        }, [dictData]);
      });

    worker.postMessage({
      cmd: 'setNearbyKeys',
      args: [keymap]
    });

    var successCount = 0;
    var waitForSuccessPromise = new Promise(function(resolve, reject) {
      worker.onmessage = function(e) {
        if (e.data.cmd !== 'success') {
          reject('worker.onmessage unexpected result ' + e.data.message + '\n');
        }

        if (e.data.fn.startsWith('setLanguage') ||
            e.data.fn.startsWith('setNearbyKeys')) {
          successCount++;

          if (successCount === 4) {
            worker.onmessage = null;
            resolve();
          }
        }
      };
    });

    return loaderPromise
      .then(function() {
        return waitForSuccessPromise;
      });
  }

  test('Worker should throw if no dictData is passed', function(done) {
    worker.postMessage({ cmd: 'setLanguage', args: ['en_us', null] });

    onWorkerMessage('error').then(function(data){
      assert.equal(data.cmd, 'error');
    }).then(done, done);
  });

  suite('en_us predictions', function() {
    setup(function(done) {
      setupLanguage('en_us', keymaps.qwerty, undefined
      ).then(done,done);
    });

    test('i should be predicted as I', function(done) {
      prediction('i', ['I', 'in', 'is', null, null, null]
      ).then(done,done);
    });

    test('Capital input should give capital output', function(done) {
      prediction('City', ['City', 'City\'s', 'Fit', null, null, null]
      ).then(done, done);
    });

    test('Non-Capital input should give non-capital output', function(done) {
      prediction('city', ['city', 'city\'s', 'fit', null, null, null]
      ).then(done, done);
    });

    test('Non existing word should not be matched', function(done) {
      prediction('sadjasuufehwuefhwejfd', [undefined, null, null, null]
      ).then(done, done);
    });

    test('$ should not yield autosuggest', function(done) {
      prediction('$', [undefined, null, null, null]
      ).then(done, done);
    });

    suite('Capitalization and suggestions', function() {
      test('virgule', function(done) {
        prediction('virgule',
          ['virgule', 'virgules', 'Virgil', null, null, null]
        ).then(done, done);
      });

      test('Virgule', function(done) {
        prediction('Virgule',
          ['Virgule', 'Virgules', 'Virgil', null, null, null]
        ).then(done, done);
      });

      test('virgul', function(done) {
        prediction('virgul',
          ['Virgil', 'Virgil\'s', 'virgule', null, null, null]
        ).then(done, done);
      });

      test('Virgul', function(done) {
        prediction('Virgul',
          ['Virgil', 'Virgil\'s', 'Virgule', null, null, null]
        ).then(done, done);
      });

      test('balds', function(done) {
        prediction('balds',
          ['balds', 'Baldwin', 'Baldwins', null, null, null]
        ).then(done, done);
      });

      test('Balds', function(done) {
        prediction('Balds',
          ['Balds', 'Baldwin', 'Baldwins', null, null, null]
        ).then(done, done);
      });

      test('chaot', function(done) {
        prediction('chaot',
          ['chaotic', 'chapter', 'chapters', null, null, null]
        ).then(done, done);
      });

      test('Chaot', function(done) {
        prediction('Chaot',
          ['Chaotic', 'Chapter', 'Chapters', null, null, null]
        ).then(done, done);
      });

      test('as', function(done) {
        prediction('as', ['as', 'ad', 'AD', null, null, null]
        ).then(done, done);
      });

      test('As', function(done) {
        prediction('As', ['As', 'Ad', 'AD', null, null, null]
        ).then(done, done);
      });

      test('keyboa', function(done) {
        prediction('keyboa', ['keyboard', null, null, null, null, null]
        ).then(done, done);
      });
    });

    suite('Low frequency dictionary words with better suggestion', function() {
      test('wont', function(done) {
        prediction('wont', ['won\'t', 'wont', 'Wong', null, null, null]
        ).then(done, done);
      });

      test('cant', function(done) {
        prediction('cant', ['can\'t', 'cant', 'canto', null, null, null]
        ).then(done, done);
      });
    });

    suite('Swear words', function() {
      test('Should not suggest word in offensive list #1', function(done) {
        worker.postMessage({ cmd: 'predict', args: ['fuc'] });

        onWorkerMessage().then(function(data) {
          var suggestions = data.suggestions;

          assert.notEqual(suggestions[0][0], 'fuck');
          assert.notEqual(suggestions[1][0], 'fuck');
          assert.notEqual(suggestions[2][0], 'fuck');
        }).then(done, done);
      });

      test('Should not suggest word in offensive list #2', function(done) {
        worker.postMessage({ cmd: 'predict', args: ['peni'] });

        onWorkerMessage().then(function(data) {
          var suggestions = data.suggestions;

          assert.notEqual(suggestions[0][0], 'penis');
          assert.notEqual(suggestions[1][0], 'penis');
          assert.notEqual(suggestions[2][0], 'penis');
        }).then(done, done);
      });

      test('Should not suggest word in offensive list #3', function(done) {
        worker.postMessage({ cmd: 'predict', args: ['fuck'] });

        onWorkerMessage().then(function(data) {
          var suggestions = data.suggestions;

          assert.equal(suggestions[1][0], 'duck');
          assert.equal(suggestions[2][0], 'Tuck');
        }).then(done, done);
      });

      test('Should suggest offensive word if matches input #1', function(done) {
        prediction('fuck', ['fuck', null, null, null, null, null]
        ).then(done, done);
      });

      test('Should suggest offensive word if matches input #2', function(done) {
        prediction('penis', ['penis', null, null, null, null, null]
        ).then(done, done);
      });

      test('Should suggest offensive word if matches input #3', function(done) {
        prediction('Penis', ['Penis', null, null, null, null, null]
        ).then(done, done);
      });

      test('Should suggest offensive word if matches input #4', function(done) {
        prediction('Vagina', ['Vagina', null, null, null, null, null]
        ).then(done, done);
      });

      test('Should suggest offensive word if matches input #5', function(done) {
        prediction('Fuck', ['Fuck', null, null, null, null, null]
        ).then(done, done);
      });

      test('Should suggest offensive word if matches input #6', function(done) {
        prediction('shit', ['shit', null, null, null, null, null]
        ).then(done, done);
      });

      test('Should suggest offensive word if matches input #7', function(done) {
        prediction('prick', ['prick', null, null, null, null, null]
        ).then(done, done);
      });

      test('Should suggest offensive word if matches input #7', function(done) {
        prediction('ass', ['ass', null, null, null, null, null]
        ).then(done, done);
      });
    });

    suite('Vertical nearby keys', function() {
      test('Asjan / Asian', function(done) {
        prediction('Asjan', ['Asian', null, null, null, null, null]
        ).then(done, done);
      });

      test('flr / for', function(done) {
        prediction('flr', ['for', null, null, null, null, null]
        ).then(done, done);
      });

      test('kn / km / in / on', function(done) {
        prediction('kn', ['km', 'in', 'on', null, null, null]
        ).then(done, done);
      });
    });
  });

  // a bit "cheating" here: if we use en_us in this suite then setLanguage will
  // early-return at setting built-in dict and "success" count will only be 3.
  // to avoid changing too many assertion logics we'll use en_gb and en_us
  // alternately.
  suite('predictions in conjuction with user dictionary', function() {
    var blob;
    setup(function() {
      blob = new WordListConverter(
        ['Mozilla', 'MozSpace', 'MozTrap', 'mozSettings', 'Mozillian'])
        .toBlob();
    });

    suite('with user dictionary blob at setupLanguage', function() {
      setup(function(done) {
        setupLanguage('en_gb', keymaps.qwerty, blob
        ).then(done,done);
      });

      test('Moz', function(done) {
        prediction('Moz',
          ['Mox', 'Mos', 'Most', 'Mod', 'MozTrap', 'Mozilla']
        ).then(done, done);
      });

      test('mozs', function(done) {
        prediction('mozs',
          ['moss', 'mods', 'mossy', 'Mossi', 'MozSpace', 'MozTrap']
        ).then(done, done);
      });
    });

    suite('with user dictionary blob supplied later', function() {
      setup(function(done) {
        setupLanguage('en_us', keymaps.qwerty, undefined).then(function() {
          worker.addEventListener('message', function onMessage(e) {
            if ('success' === e.data.cmd && 'setUserDictionary' === e.data.fn) {
              worker.removeEventListener('messgae', onMessage);
            }
          });
          worker.postMessage({
            cmd: 'setUserDictionary',
            args: [blob]
          });
        }).then(done,done);
      });

      test('Moz', function(done) {
        prediction('Moz',
          ['MOX', 'Mos', 'Most', 'Mod', 'MozTrap', 'Mozilla']
        ).then(done, done);
      });

      test('mozs', function(done) {
        prediction('mozs',
          ['moss', 'Moss', 'mods', 'mossy', 'MozSpace', 'MozTrap']
        ).then(done, done);
      });
    });


    suite('with user dictionary blob nullified later', function() {
      setup(function(done) {
        setupLanguage('en_gb', keymaps.qwerty, blob).then(function() {
          worker.addEventListener('message', function onMessage(e) {
            if ('success' === e.data.cmd && 'setUserDictionary' === e.data.fn) {
              worker.removeEventListener('messgae', onMessage);
            }
          });
          worker.postMessage({
            cmd: 'setUserDictionary',
            args: [undefined]
          });
        }).then(done,done);
      });

      // do not append "null" there: we want to make sure the suggestions cut at
      // the fourth element.
      test('Moz', function(done) {
        prediction('Moz', ['Mox', 'Mos', 'Most', 'Mod']
        ).then(done, done);
      });

      test('mozs', function(done) {
        prediction('mozs', ['moss', 'mods', 'mossy', 'Mossi']
        ).then(done, done);
      });
    });
  });

  suite('fr predictions', function() {
    setup(function(done) {
      setupLanguage('fr', keymaps.azerty, undefined
      ).then(done,done);
    });

    test('123 should not yield prediction', function(done) {
      prediction('123', [null, null, null, null, null, null]
      ).then(done, done);
    });
  });

  suite('validChars() is tolerant on small dicts', function() {
    setup(function(done) {
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
            done();
          }
        }
      };
    });

    test('app should yield prediction', function(done) {
      prediction('app', ['Ápple', null, null]
      ).then(done, done);
    });
  });
});
