/*global requireApp suite setup test teardown sinon KeyEvent */

requireApp('keyboard/test/unit/setup_engine.js');
requireApp('keyboard/js/imes/latin/latin.js');

suite('Latin suggestions', function() {
  var im, workers = [], imSettings;
  var _windowWorker;

  function queue(q, n) {
    q.length ? q.shift()(queue.bind(this, q, n)) : n();
  }

  setup(function() {
    // This is the input method object we're testing
    im = InputMethods.latin;

    imSettings = {
      resetUpperCase: sinon.stub(),
      sendKey: sinon.stub().returns(
        new Promise(function(res, rej) { res(); })),
      sendString: sinon.stub(),
      sendCandidates: sinon.stub(),
      setUpperCase: sinon.stub(),
      setLayoutPage: sinon.stub(),
      replaceSurroundingText: sinon.stub().returns(
        new Promise(function(res, rej) { res(); }))
    };
    im.init(imSettings);

    _windowWorker = window.Worker;
    var worker = window.Worker = function() {
      workers.push(this);
    };
    worker.prototype.postMessage = function() {};
  });

  teardown(function() {
    window.Worker = _windowWorker;
  });

  function setState(value, cursorStart, cursorEnd) {
    im.activate('en', {
      type: 'text',
      inputmode: 'latin-prose',
      value: value,
      selectionStart: cursorStart || value.length,
      selectionEnd: cursorEnd || value.length
    }, {
      suggest: true,
      correct: true
    });
  }

  test('Suggestion data doesnt match input? Ignore.', function() {
    setState('janj');

    workers[0].onmessage({
      data: {
        cmd: 'predictions',
        input: 'jan', // old input
        suggestions: [
          ['Jan', 1],
          ['jan', 1],
          ['Pietje', 1]
        ]
      }
    });

    sinon.assert.callCount(imSettings.sendCandidates, 1);
    // maybe we shouldnt call this at all? don't know...
    sinon.assert.calledWith(imSettings.sendCandidates, []);
  });

  test('One char input should not autocorrect to a multichar word', function() {
    setState('n');

    workers[0].onmessage({
      data: {
        cmd: 'predictions',
        input: 'n',
        suggestions: [
          ['no', 1], // we want to ensure that this first suggestion is not
                  // marked (with * prefix) as an autocorrection
          ['not', 1],
          ['now', 1]
        ]
      }
    });

    sinon.assert.callCount(imSettings.sendCandidates, 1);
    // maybe we shouldnt call this at all? don't know...
    sinon.assert.calledWith(imSettings.sendCandidates,
      ['no', 'not', 'now']); // Make sure we do not get "*no"

    // But we also want to be sure that single letters like i do get
    // autocorrected to single letter words like I
    setState('i');

    workers[0].onmessage({
      data: {
        cmd: 'predictions',
        input: 'i',
        suggestions: [
          ['I', 1], // we're testing that this gets marked as an autocorrection
          ['in', 1],
          ['it', 1]
        ]
      }
    });

    sinon.assert.calledWith(imSettings.sendCandidates,
      ['*I', 'in', 'it']);
  });

  test('Shows suggestions from worker: input is not a word', function() {
    setState('jan');

    workers[0].onmessage({
      data: {
        cmd: 'predictions',
        input: 'jan',
        suggestions: [
          ['Jan', 1],
          ['han', 1],
          ['Pietje', 1],
          ['extra', 1]
        ]
      }
    });

    sinon.assert.callCount(imSettings.sendCandidates, 1);
    // Show 3 suggestions and mark the first as an autocorrect
    sinon.assert.calledWith(imSettings.sendCandidates,
                            ['*Jan', 'han', 'Pietje']);
  });

  test('Shows suggestions from worker: input is a common word', function() {
    setState('the');

    workers[0].onmessage({
      data: {
        cmd: 'predictions',
        input: 'the',
        suggestions: [
          ['the', 10],
          ['they', 5],
          ['then', 4],
          ['there', 3]
        ]
      }
    });

    sinon.assert.callCount(imSettings.sendCandidates, 1);
    // Verify that we show 3 suggestions that do not include the input
    // and that we do not mark the first as an autocorrection.
    sinon.assert.calledWith(imSettings.sendCandidates,
                            ['they', 'then', 'there']);
  });

  test('Shows suggestions from worker: input is an uncommon word', function() {
    setState('wont');

    workers[0].onmessage({
      data: {
        cmd: 'predictions',
        input: 'wont',
        suggestions: [
          ['won\'t', 10],
          ['wont', 8],
          ['won', 7],
          ['went', 6]
        ]
      }
    });

    sinon.assert.callCount(imSettings.sendCandidates, 1);
    // Verify that we show 3 suggestions that do not include the input
    // and that we do mark the first as an autocorrection because it is
    // more common than the valid word input.
    sinon.assert.calledWith(imSettings.sendCandidates,
                            ['*won\'t', 'won', 'went']);
  });

  test('Space to accept suggestion', function(next) {
    setState('jan');

    workers[0].onmessage({
      data: {
        cmd: 'predictions',
        input: 'jan',
        suggestions: [
          ['Jan'],
          ['han'],
          ['Pietje']
        ]
      }
    });

    im.click(KeyEvent.DOM_VK_SPACE).then(function() {
      sinon.assert.callCount(imSettings.replaceSurroundingText, 1);
      sinon.assert.calledWith(imSettings.replaceSurroundingText, 'Jan', -3, 3);
      sinon.assert.calledWith(imSettings.sendKey, KeyEvent.DOM_VK_SPACE);

      next();
    });
  });

  test('Should communicate updated text to worker', function(next) {
    setState('');

    workers[0].postMessage = sinon.stub();

    function clickAndAssert(key, assertion, callback) {
      im.click(key.charCodeAt(0)).then(function() {
        sinon.assert.calledWith(workers[0].postMessage,
                        { args: [assertion], cmd: 'predict' });
        callback();
      });
    }

    queue([
      clickAndAssert.bind(null, 'p', 'p'),
      clickAndAssert.bind(null, 'a', 'pa'),
      clickAndAssert.bind(null, 'i', 'pai')
    ], function() {
      sinon.assert.callCount(workers[0].postMessage, 3);
      next();
    });
  });

  test('Two spaces after suggestion should autopunctuate', function(next) {
    setState('jan');

    workers[0].onmessage({
      data: {
        cmd: 'predictions',
        input: 'jan',
        suggestions: [
          ['Jan'],
          ['han'],
          ['Pietje']
        ]
      }
    });

    im.click(KeyEvent.DOM_VK_SPACE).then(function() {
      return im.click(KeyEvent.DOM_VK_SPACE);
    }).then(function() {
      sinon.assert.callCount(imSettings.replaceSurroundingText, 1);
      sinon.assert.calledWith(imSettings.replaceSurroundingText, 'Jan', -3, 3);

      sinon.assert.callCount(imSettings.sendKey, 4);
      assert.equal(imSettings.sendKey.args[0][0], KeyEvent.DOM_VK_SPACE);
      assert.equal(imSettings.sendKey.args[1][0], KeyEvent.DOM_VK_BACK_SPACE);
      assert.equal(imSettings.sendKey.args[2][0], '.'.charCodeAt(0));
      assert.equal(imSettings.sendKey.args[3][0], ' '.charCodeAt(0));
      next();
    });
  });

  test('dismissSuggestions hides suggestions and inserts space', function() {
    im.dismissSuggestions();

    // Send candidates should be called once with an empty array
    // to clear the list of word suggestions
    sinon.assert.callCount(imSettings.sendCandidates, 1);
    sinon.assert.calledWith(imSettings.sendCandidates, []);

    // Also, a space should be inserted
    sinon.assert.callCount(imSettings.sendKey, 1);
    sinon.assert.calledWith(imSettings.sendKey, 32);
  });

});
