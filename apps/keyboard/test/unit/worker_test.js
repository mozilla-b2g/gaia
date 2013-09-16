/*global suite suiteSetup setup test sinon assert */
suite('Latin en_us worker', function() {
  var worker;
  suiteSetup(function(next) {
    worker = new Worker('../../js/imes/latin/worker.js');
    worker.postMessage({ cmd: 'setLanguage', args: ['en_us']});
    worker.postMessage({
      cmd: 'setNearbyKeys',
      args: [{
        '46': {
          '109': 0.2243131351147911,
          '110': 0.2243131351147911
        },
        '97': {
          '113': 0.2243131351147911,
          '115': 0.5820312499999999,
          '119': 0.2243131351147911,
          '122': 0.17401459854014598
        },
        '98': {
          '103': 0.17401459854014598,
          '104': 0.2482299042065806,
          '106': 0.17401459854014598,
          '110': 0.5820312499999999,
          '118': 0.5820312499999999
        },
        '99': {
          '100': 0.17401459854014598,
          '102': 0.2482299042065806,
          '103': 0.17401459854014598,
          '118': 0.5820312499999999,
          '120': 0.5820312499999999
        },
        '100': {
          '99': 0.17401459854014598,
          '101': 0.2243131351147911,
          '102': 0.5820312499999999,
          '114': 0.2243131351147911,
          '115': 0.5820312499999999,
          '120': 0.2482299042065806,
          '122': 0.17401459854014598
        },
        '101': {
          '100': 0.2243131351147911,
          '114': 0.5820312499999999,
          '115': 0.2243131351147911,
          '119': 0.5820312499999999
        },
        '102': {
          '99': 0.2482299042065806,
          '100': 0.5820312499999999,
          '103': 0.5820312499999999,
          '114': 0.2243131351147911,
          '116': 0.2243131351147911,
          '118': 0.17401459854014598,
          '120': 0.17401459854014598
        },
        '103': {
          '98': 0.17401459854014598,
          '99': 0.17401459854014598,
          '102': 0.5820312499999999,
          '104': 0.5820312499999999,
          '116': 0.2243131351147911,
          '118': 0.2482299042065806,
          '121': 0.2243131351147911
        },
        '104': {
          '98': 0.2482299042065806,
          '103': 0.5820312499999999,
          '106': 0.5820312499999999,
          '110': 0.17401459854014598,
          '117': 0.2243131351147911,
          '118': 0.17401459854014598,
          '121': 0.2243131351147911
        },
        '105': {
          '106': 0.2243131351147911,
          '107': 0.2243131351147911,
          '111': 0.5820312499999999,
          '117': 0.5820312499999999
        },
        '106': {
          '98': 0.17401459854014598,
          '104': 0.5820312499999999,
          '105': 0.2243131351147911,
          '107': 0.5820312499999999,
          '109': 0.17401459854014598,
          '110': 0.2482299042065806,
          '117': 0.2243131351147911
        },
        '107': {
          '105': 0.2243131351147911,
          '106': 0.5820312499999999,
          '108': 0.5820312499999999,
          '109': 0.2482299042065806,
          '110': 0.17401459854014598,
          '111': 0.2243131351147911
        },
        '108': {
          '107': 0.5820312499999999,
          '109': 0.17401459854014598,
          '111': 0.2243131351147911,
          '112': 0.2243131351147911
        },
        '109': {
          '46': 0.2243131351147911,
          '106': 0.17401459854014598,
          '107': 0.2482299042065806,
          '108': 0.17401459854014598,
          '110': 0.5820312499999999
        },
        '110': {
          '46': 0.2243131351147911,
          '98': 0.5820312499999999,
          '104': 0.17401459854014598,
          '106': 0.2482299042065806,
          '107': 0.17401459854014598,
          '109': 0.5820312499999999
        },
        '111': {
          '105': 0.5820312499999999,
          '107': 0.2243131351147911,
          '108': 0.2243131351147911,
          '112': 0.5820312499999999
        },
        '112': {
          '108': 0.2243131351147911,
          '111': 0.5820312499999999
        },
        '113': {
          '97': 0.2243131351147911,
          '119': 0.5820312499999999
        },
        '114': {
          '100': 0.2243131351147911,
          '101': 0.5820312499999999,
          '102': 0.2243131351147911,
          '116': 0.5820312499999999
        },
        '115': {
          '97': 0.5820312499999999,
          '100': 0.5820312499999999,
          '101': 0.2243131351147911,
          '119': 0.2243131351147911,
          '120': 0.17401459854014598,
          '122': 0.2482299042065806
        },
        '116': {
          '102': 0.2243131351147911,
          '103': 0.2243131351147911,
          '114': 0.5820312499999999,
          '121': 0.5820312499999999
        },
        '117': {
          '104': 0.2243131351147911,
          '105': 0.5820312499999999,
          '106': 0.2243131351147911,
          '121': 0.5820312499999999
        },
        '118': {
          '98': 0.5820312499999999,
          '99': 0.5820312499999999,
          '102': 0.17401459854014598,
          '103': 0.2482299042065806,
          '104': 0.17401459854014598
        },
        '119': {
          '97': 0.2243131351147911,
          '101': 0.5820312499999999,
          '113': 0.5820312499999999,
          '115': 0.2243131351147911
        },
        '120': {
          '99': 0.5820312499999999,
          '100': 0.2482299042065806,
          '102': 0.17401459854014598,
          '115': 0.17401459854014598,
          '122': 0.5820312499999999,
          '65533': 0.2002015451797111
        },
        '121': {
          '103': 0.2243131351147911,
          '104': 0.2243131351147911,
          '116': 0.5820312499999999,
          '117': 0.5820312499999999
        },
        '122': {
          '97': 0.17401459854014598,
          '100': 0.17401459854014598,
          '115': 0.2482299042065806,
          '120': 0.5820312499999999,
          '65533': 0.24178498985801217
        },
        '65534': {
          '122': 0.22094476380904773,
          '65533': 0.3836805555555555
        },
        '65533': {
          '120': 0.296943231441048,
          '122': 0.35862068965517235,
          '65534': 0.3836805555555555
        }
      }]
    });

    setTimeout(next, 1000);
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
    worker.postMessage({ cmd: 'setLanguage', args: ['en'] });
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
      prediction('City', ['City', 'City\'s', 'Cot'], next);
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
          assert.equal(suggestions[2][0], 'ducks');

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
  });

});
