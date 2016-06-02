/* global utils, loadBodyHTML */
'use strict';

var realOnTouchStart;

realOnTouchStart = window.ontouchstart;
delete window.ontouchstart;

require('/shared/js/contacts/contacts_shortcuts.js');

suite('contacts_shortcuts AKA Alpha Scroller', function() {

  var subject;
  var params;
  var scrollSpy;
  var eventsSpy;

  // Fill the params object with the information
  // needed to initialise the alpha scroller.
  // Creates the necesary dom as well.
  function createAlphaScrollParams() {
    loadBodyHTML('/contacts/test/unit/utilities/contacts_shortcuts.html');
    params = {
      overlay: document.getElementById('overlay'),
      jumper: document.getElementById('jumper'),
      groupSelector: '#group-',
      scrollToCb: function (domTarget, group) {},
      desktop: true
    };
  }

  // Given a letter returns the dom element to trigger
  // events over it. Take into account the special cases.
  function getLetterElement(letter) {
    var anchor = 'group-' + letter;
    if (letter.length > 1) {
      anchor = letter;
    }

    return document.querySelector('li[data-anchor="' + anchor + '"]');
  }

  // Send events to start touching a letter.
  // Despite of saying touch, we dispatch clicks events,
  // to make the test case easier
  function touchStartLetter(letter) {
    var elem = getLetterElement(letter);
    dispatchEvent('mousedown', elem);
  }

  function touchMoveLetter(letter) {
    var elem = getLetterElement(letter);
    dispatchEvent('mousemove', elem);
  }

  function touchEndLetter(letter) {
    var elem = getLetterElement(letter);
    dispatchEvent('mouseup', elem);
  }

  function dispatchEvent(type, elem) {
    var event = new MouseEvent(type, {
      'view': window,
      'bubbles': true,
      'cancelable': true
    });
    elem.dispatchEvent(event);
  }

  suiteSetup(function () {
    subject = utils.alphaScroll;
  });

  suiteTeardown(function() {
    window.ontouchstart = realOnTouchStart;
    realOnTouchStart = null;
  });

  setup(function () {
    createAlphaScrollParams();
    scrollSpy = this.sinon.spy(params, 'scrollToCb');
    eventsSpy = this.sinon.spy(params.jumper, 'addEventListener');

    subject.init(params);
  });

  suite('> initialization', function () {
    test('> listeners attached', function () {
      sinon.assert.callCount(eventsSpy, 3);
    });
  });

  suite('> scrolling', function () {
    test('> scrolling from A to B', function () {
      touchStartLetter('A');
      touchMoveLetter('B');
      touchEndLetter('B');
      sinon.assert.calledTwice(scrollSpy);
      assert.equal(scrollSpy.getCall(0).args[1], 'A');
      assert.equal(scrollSpy.getCall(1).args[1], 'B');
    });

    test('> when scrolling out of #, hide overlay inmediately', function () {
      touchStartLetter('#');
      touchMoveLetter('#');
      touchEndLetter('#');
      assert.equal(params.overlay.style.MozTransitionDuration, '0s');
    });

  });

});
