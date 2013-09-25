/*global requireApp suite setup test teardown sinon KeyEvent */
var InputMethods = {};

requireApp('keyboard/js/imes/latin/latin.js');

suite('Latin suggestions', function() {
  var im, workers = [], imSettings;
  var _windowWorker;

  setup(function() {
    // This is the input method object we're testing
    im = InputMethods.latin;

    imSettings = {
      resetUpperCase: sinon.stub(),
      sendKey: sinon.stub(),
      sendString: sinon.stub(),
      sendCandidates: sinon.stub(),
      setUpperCase: sinon.stub(),
      setLayoutPage: sinon.stub(),
      replaceSurroundingText: sinon.stub()
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
          ['Jan'],
          ['jan'],
          ['Pietje']
        ]
      }
    });

    sinon.assert.callCount(imSettings.sendCandidates, 1);
    // maybe we shouldnt call this at all? don't know...
    sinon.assert.calledWith(imSettings.sendCandidates, []);
  });

  test('One char input should not show default to multichar', function() {
    setState('i');

    workers[0].onmessage({
      data: {
        cmd: 'predictions',
        input: 'i',
        suggestions: [
          ['BestSuggestion'], // normally this would get the *
          ['A'],
          ['i']
        ]
      }
    });

    sinon.assert.callCount(imSettings.sendCandidates, 1);
    // maybe we shouldnt call this at all? don't know...
    sinon.assert.calledWith(imSettings.sendCandidates,
      ['*i', 'BestSuggestion', 'A']);
  });

  test('Shows suggestions from worker', function() {
    setState('jan');

    workers[0].onmessage({
      data: {
        cmd: 'predictions',
        input: 'jan',
        suggestions: [
          ['Jan'],
          ['jan'],
          ['Pietje']
        ]
      }
    });

    sinon.assert.callCount(imSettings.sendCandidates, 1);
    sinon.assert.calledWith(imSettings.sendCandidates,
      ['*Jan', 'jan', 'Pietje']);
  });

  test('Space to accept suggestion', function() {
    setState('jan');

    workers[0].onmessage({
      data: {
        cmd: 'predictions',
        input: 'jan',
        suggestions: [
          ['Jan'],
          ['jan'],
          ['Pietje']
        ]
      }
    });

    im.click(KeyEvent.DOM_VK_SPACE);

    sinon.assert.callCount(imSettings.replaceSurroundingText, 1);
    sinon.assert.calledWith(imSettings.replaceSurroundingText, 'Jan ', 3, 0);
  });

  test('Should communicate updated text to worker', function() {
    setState('');

    workers[0].postMessage = sinon.stub();

    im.click('p'.charCodeAt(0));
    sinon.assert.calledWith(workers[0].postMessage,
                            { args: ['p'], cmd: 'predict' });

    im.click('a'.charCodeAt(0));
    sinon.assert.calledWith(workers[0].postMessage,
                            { args: ['pa'], cmd: 'predict' });

    im.click('i'.charCodeAt(0));
    sinon.assert.calledWith(workers[0].postMessage,
                            { args: ['pai'], cmd: 'predict' });

    sinon.assert.callCount(workers[0].postMessage, 3);
  });

  test('Two spaces after suggestion should autopunctuate', function() {
    setState('jan');

    workers[0].onmessage({
      data: {
        cmd: 'predictions',
        input: 'jan',
        suggestions: [
          ['Jan'],
          ['jan'],
          ['Pietje']
        ]
      }
    });

    im.click(KeyEvent.DOM_VK_SPACE);
    im.click(KeyEvent.DOM_VK_SPACE);

    sinon.assert.callCount(imSettings.replaceSurroundingText, 1);
    sinon.assert.calledWith(imSettings.replaceSurroundingText, 'Jan ', 3, 0);

    sinon.assert.callCount(imSettings.sendKey, 3);
    assert.equal(imSettings.sendKey.args[0][0], 8); // backspace
    assert.equal(imSettings.sendKey.args[1][0], '.'.charCodeAt(0));
    assert.equal(imSettings.sendKey.args[2][0], ' '.charCodeAt(0));
  });
});
