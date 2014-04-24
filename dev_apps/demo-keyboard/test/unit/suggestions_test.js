'use strict';

/*global Suggestions */

requireApp('demo-keyboard/js/suggestions.js');

mocha.setup({
  globals: [
    'Suggestions'
  ]
});

suite('Suggestions', function() {
  var autoCorrect, styleEl;
  suiteSetup(function() {
    styleEl = document.createElement('style');
    styleEl.innerHTML =
    '.suggestion { display: inline-block; }' +
    '.dismiss-suggestions-button { display: inline-block; width: 0; }';
    document.documentElement.firstElementChild.appendChild(styleEl);
  });

  suiteTeardown(function() {
    document.documentElement.firstElementChild.removeChild(styleEl);
  });

  setup(function() {
    autoCorrect = {
      container: document.createElement('div'),
      handleSelectionSelected: sinon.stub(),
      handleSelectionDismissed: sinon.stub()
    };

    autoCorrect.container.style.width = '360px';
    autoCorrect.container.style.fontSize = '24px';
    autoCorrect.container.style.fontFamily = 'monospace';
    document.body.appendChild(autoCorrect.container);
  });

  teardown(function() {
    document.body.removeChild(autoCorrect.container);

    autoCorrect = null;
  });

  test('start/stop', function() {
    var container = autoCorrect.container;
    var suggestions = new Suggestions(autoCorrect);

    suggestions.start();

    assert.equal(container.firstElementChild, suggestions.suggestionsContainer,
      'suggestionsContainer is appended');
    assert.equal(suggestions.suggestionsContainer.className,
      Suggestions.prototype.CONTAINER_CLASS_NAME,
      'suggestionsContainer has the right className.');

    suggestions.stop();

    assert.equal(container.firstElementChild, null,
      'suggestionsContainer is removed.');
    assert.equal(suggestions.suggestionsContainer, null,
      'suggestionsContainer reference is removed.');
  });

  test('display (short words)', function() {
    var suggestions = new Suggestions(autoCorrect);

    suggestions.start();
    suggestions.display(['*foo', 'bar', 'hello', 'world']);

    assert.equal(
      suggestions.suggestionsContainer.firstElementChild.className,
      'dismiss-suggestions-button',
      'has dismissed button');

    var suggestionsChildren = suggestions.suggestionsContainer.children;

    assert.equal(
      suggestionsChildren[1].className,
      'suggestion autocorrect',
      'has suggestion and autocorrect class');
    assert.equal(
      suggestionsChildren[1].dataset.word,
      'foo',
      'has correct dataset text');
    assert.equal(
      suggestionsChildren[1].firstElementChild.textContent,
      'foo',
      'has correct text');

    assert.equal(
      suggestionsChildren[2].className,
      'suggestion',
      'has suggestion class');
    assert.equal(
      suggestionsChildren[2].dataset.word,
      'bar',
      'has correct dataset text');
    assert.equal(
      suggestionsChildren[2].firstElementChild.textContent,
      'bar',
      'has correct text');

    assert.equal(
      suggestionsChildren[3].className,
      'suggestion',
      'has suggestion class');
    assert.equal(
      suggestionsChildren[3].dataset.word,
      'hello',
      'has correct dataset text');
    assert.equal(
      suggestionsChildren[3].firstElementChild.textContent,
      'hello',
      'has correct text');

    assert.equal(
      suggestionsChildren[4].className,
      'suggestion',
      'has suggestion class');
    assert.equal(
      suggestionsChildren[4].dataset.word,
      'world',
      'has correct dataset text');
    assert.equal(
      suggestionsChildren[4].firstElementChild.textContent,
      'world',
      'has correct text');

    suggestions.stop();
  });

  test('display (long words)', function() {
    // Make sure these numbers are indenpendent of the environment
    // of the test is being run, since fonts/rendering are different
    // between platforms.
    //
    // (these numbers are extracted from MacOS X Desktop Firefox)
    var longWordWidth = {
      'thisisverylongword': 259.20001220703125,
      'thisisve…longword': 244.8000030517578,
      'thisisv…ongword': 216,
      'thisis…ngword': 187.1999969482422,
      'alsoverylongword': 230.39999389648438,
      'alsover…ongword': 216,
      'alsove…ngword': 187.1999969482422,
      'whatup': 86.39999389648438
    };

    // Hijack createElement for <span>'s (the inner element of each suggestions)
    var realCreateElement = document.createElement;
    document.createElement = function(tagName) {
      var el = realCreateElement.call(document, tagName);
      if (tagName !== 'span') {
        return el;
      }

      var realGetBoundingClientRect = el.getBoundingClientRect;

      el.getBoundingClientRect = function() {
        if (longWordWidth[el.textContent]) {
          return {
            width: longWordWidth[el.textContent]
          };
        }

        return realGetBoundingClientRect.call(el);
      };

      return el;
    };

    var suggestions = new Suggestions(autoCorrect);
    suggestions.start();
    suggestions.display(
      ['thisisverylongword', 'alsoverylongword', 'whatup']);

    assert.equal(
      suggestions.suggestionsContainer.firstElementChild.className,
      'dismiss-suggestions-button',
      'has dismissed button');

    var suggestionsChildren = suggestions.suggestionsContainer.children;

    assert.equal(
      suggestionsChildren[1].className,
      'suggestion',
      'has suggestion class');
    assert.equal(
      suggestionsChildren[1].dataset.word,
      'thisisverylongword',
      'has correct dataset text');
    var span1 = suggestionsChildren[1].firstElementChild;
    assert.equal(span1.textContent,
      'thisis…ngword',
      'has correct text');
    assert.equal(span1.style.width, '166.667%');
    assert.equal(span1.style.transformOrigin, 'left center 0px');
    assert.equal(span1.style.transform, 'scale(0.6)');

    assert.equal(
      suggestionsChildren[2].className,
      'suggestion',
      'has suggestion class');
    assert.equal(
      suggestionsChildren[2].dataset.word,
      'alsoverylongword',
      'has correct dataset text');
    var span2 = suggestionsChildren[2].firstElementChild;
    assert.equal(
      suggestionsChildren[2].firstElementChild.textContent,
      'alsove…ngword',
      'has correct text');
    assert.equal(span2.style.width, '166.667%');
    assert.equal(span2.style.transformOrigin, 'left center 0px');
    assert.equal(span2.style.transform, 'scale(0.6)');

    assert.equal(
      suggestionsChildren[3].className,
      'suggestion',
      'has suggestion class');
    assert.equal(
      suggestionsChildren[3].dataset.word,
      'whatup',
      'has correct dataset text');
    assert.equal(
      suggestionsChildren[3].firstElementChild.textContent,
      'whatup',
      'has correct text');

    suggestions.stop();

    document.createElement = realCreateElement;
  });

  test('display nothing', function() {
    var suggestions = new Suggestions(autoCorrect);

    suggestions.start();
    suggestions.display([]);

    var suggestionsChildren = suggestions.suggestionsContainer.children;
    assert.equal(suggestionsChildren.length, 0, 'suggestions is empty');

    suggestions.stop();
  });

  test('select', function() {
    var suggestions = new Suggestions(autoCorrect);

    suggestions.start();
    suggestions.display(['*foo', 'bar', 'hello', 'world']);

    var suggestionsChildren = suggestions.suggestionsContainer.children;

    // XXX Send a fake event here since we might not be able to create
    // a DOM touch event on this platform.
    suggestions.handleEvent({
      type: 'touchend',
      target: suggestionsChildren[3].firstElementChild
    });

    assert.isTrue(autoCorrect.handleSelectionSelected.calledOnce,
      'handleSelectionSelected is called once.');
    assert.equal(autoCorrect.handleSelectionSelected.getCall(0).args[0],
      'hello ',
      'handleSelectionSelected is called with the right word and a space.');

    suggestions.stop();
  });

  test('dismiss', function() {
    var suggestions = new Suggestions(autoCorrect);

    suggestions.start();
    suggestions.display(['*foo', 'bar', 'hello', 'world']);

    var suggestionsChildren = suggestions.suggestionsContainer.children;

    // XXX Send a fake event here since we might not be able to create
    // a DOM touch event on this platform.
    suggestions.handleEvent({
      type: 'touchend',
      target: suggestionsChildren[0]
    });

    assert.isTrue(autoCorrect.handleSelectionDismissed.calledOnce,
      'handleSelectionDismissed is called once.');

    suggestions.stop();
  });
});

