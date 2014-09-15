/*global suite suiteSetup setup test sinon assert requireApp */
requireApp('keyboard/test/unit/setup_engine.js');
requireApp('keyboard/js/imes/latin/latin.js');

suite('Latin en_us worker', function() {
  var worker;
  suiteSetup(function(next) {
    worker = new Worker('../../../../js/imes/latin/worker.js');

    worker.postMessage({ cmd: 'setLanguage', args: ['en_us'] });

    var keymap = InputMethods.latin.generateNearbyKeyMap({
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

      if (e.data.fn === 'setLanguage' || e.data.fn === 'setNearbyKeys') {
        successCount++;

        if (successCount === 2) {
          next();
        }
      }
    };
  });

  setup(function() {
    worker.onmessage = sinon.stub();
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

  function assertOnMessageCalledWith(args) {
    args = JSON.stringify(args);

    var res = worker.onmessage.args.filter(function(call) {
      return call[0].data &&
        JSON.stringify(call[0].data) === args;
    });

    if (res.length === 0) {
      worker.onmessage.args.map(function(call) {
        if (!call[0].data) return;
        console.log(call[0].data);
      });
    }

    assert.notEqual(res.length, 0);
  }

  test('Worker should throw if language doesnt exist', function(next) {
    worker.postMessage({ cmd: 'setLanguage', args: ['no-existente'] });
    onWorkerMessage(function(data) {

      assert.equal(data.cmd, 'error');
      next();
    });
  });

  suite('Predicitions', function() {
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
        if (expected[1] !== null)
          assert.equal(suggestions[1], expected[1]);
        if (expected[2] !== null)
          assert.equal(suggestions[2], expected[2]);

        next();
      });
    }

    test('i should be predicted as I', function(next) {
      prediction('i', ['I', 'in', 'is'], next);
    });

    test('Capital input should give capital output', function(next) {
      prediction('City', ['City', 'City\'s', 'Fit'], next);
    });

    test('Non-Capital input should give non-capital output', function(next) {
      prediction('city', ['city', 'city\'s', 'fit'], next);
    });

    test('Non existing word should not be matched', function(next) {
      prediction('sadjasuufehwuefhwejfd', [], next);
    });

    suite('Capitalization and suggestions', function() {
      test('virgule', function(next) {
        prediction('virgule', ['virgule', 'virgules', 'Virgil'], next);
      });

      test('Virgule', function(next) {
        prediction('Virgule', ['Virgule', 'Virgules', 'Virgil'], next);
      });

      test('virgul', function(next) {
        prediction('virgul', ['Virgil', 'Virgil\'s', 'virgule'], next);
      });

      test('Virgul', function(next) {
        prediction('Virgul', ['Virgil', 'Virgil\'s', 'Virgule'], next);
      });

      test('balds', function(next) {
        prediction('balds', ['balds'], next);
      });

      test('Balds', function(next) {
        prediction('Balds', ['Balds'], next);
      });

      test('chaot', function(next) {
        prediction('chaot', ['chaotic', 'chapter', 'chapters'], next);
      });

      test('Chaot', function(next) {
        prediction('Chaot', ['Chaotic', 'Chapter', 'Chapters'], next);
      });

      test('as', function(next) {
        prediction('as', ['as', 'ask', 'ash'], next);
      });

      test('As', function(next) {
        prediction('As', ['As', 'Ask', 'Ash'], next);
      });
    });

    suite('Low frequency dictionary words with better suggestion', function() {
      test('wont', function(next) {
        prediction('wont', ['won\'t', 'wont', 'winter'], next);
      });

      test('cant', function(next) {
        prediction('cant', ['can\'t', 'cant', 'canto'], next);
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
        prediction('fuck', ['fuck', null, null], next);
      });

      test('Should suggest offensive word if matches input #2', function(next) {
        prediction('penis', ['penis', null, null], next);
      });

      test('Should suggest offensive word if matches input #3', function(next) {
        prediction('Penis', ['Penis', null, null], next);
      });

      test('Should suggest offensive word if matches input #4', function(next) {
        prediction('Vagina', ['Vagina', null, null], next);
      });

      test('Should suggest offensive word if matches input #5', function(next) {
        prediction('Fuck', ['Fuck', null, null], next);
      });

      test('Should suggest offensive word if matches input #6', function(next) {
        prediction('shit', ['shit', null, null], next);
      });

      test('Should suggest offensive word if matches input #7', function(next) {
        prediction('prick', ['prick', null, null], next);
      });

      test('Should suggest offensive word if matches input #7', function(next) {
        prediction('ass', ['ass', null, null], next);
      });
    });

    suite('Vertical nearby keys', function() {
      test('Asjan / Asian', function(next) {
        prediction('Asjan', ['Asian', null, null], next);
      });

      test('flr / for', function(next) {
        prediction('flr', ['for', null, null], next);
      });

      test('kn / km / in / on', function(next) {
        prediction('kn', ['km', 'in', 'on'], next);
      });
    });
  });
});
