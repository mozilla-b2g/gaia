'use strict';

var Dialer = require('./lib/dialer');
var ReflowHelper =
  require('../../../../../tests/jsmarionette/plugins/reflow_helper.js');

marionette('Dialer > Keypad', function() {
  var assert = require('assert');

  var client = marionette.client({
    profile: Dialer.config,
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });
  var subject;
  var selectors;
  var actions;

  var reflowHelper;

  setup(function() {
    actions = client.loader.getActions();
    subject = new Dialer(client);
    subject.launch();

    selectors = Dialer.Selectors;

    var keypad = subject.client.findElement(selectors.keypadView);
    client.waitFor(function() {
      return keypad.displayed();
    });

    reflowHelper = new ReflowHelper(client);
  });

  function typeNumber() {
    var one = subject.client.findElement(selectors.one);
    keypadTap(one);

    var two = subject.client.findElement(selectors.two);
    keypadTap(two);

    var three = subject.client.findElement(selectors.three);
    keypadTap(three);
  }

  // Taps digits in 1, 2, 3 sequence until producing an ellipsis. We make this
  // instead of entering fixed number as the digit at which the ellipsis
  // appears depends on the integration environment.
  function typeLongNumber() {
    var number = subject.client.findElement(selectors.phoneNumber);
    var numberTyped = '';

    var one = subject.client.findElement(selectors.one);
    var two = subject.client.findElement(selectors.two);
    var three = subject.client.findElement(selectors.three);
    var sequence = [one, two, three];
    var length = sequence.length;
    for (var i = 0, digit; (digit = sequence[i]); i = (i+1) % length) {
      keypadTap(digit);
      numberTyped += digit.getAttribute('data-value');
      if (number.getAttribute('value').indexOf('\u2026') === 0) {
        return numberTyped;
      }
    }
  }

  // Avoid "all the same number" patterns like 111111... because, under
  // ellipsis scenaries, the value of the input won't change and the test
  // will timeout.
  function keypadTap(elem, longPress) {
    var number = subject.client.findElement(selectors.phoneNumber);
    var previousValue = number.getAttribute('value');

    if (longPress) {
      actions.longPress(elem, 1).perform();
    } else {
      actions.tap(elem).perform();
    }

    client.waitFor(function () {
      return number.getAttribute('value') !== previousValue;
    });
  }

  function loadSuggestionDOM() {
    typeNumber();

    var del = subject.client.findElement(selectors.del);
    actions.longPress(del, 1).perform();

    var number = subject.client.findElement(selectors.phoneNumber);
    client.waitFor(function() {
      return (number.getAttribute('value') === '');
    });
  }

  test('Entering a 3 digits number with the keypad', function() {
    loadSuggestionDOM();
    reflowHelper.startTracking(Dialer.URL + '/manifest.webapp');
    typeNumber();

    var number = subject.client.findElement(selectors.phoneNumber);
    assert.equal(number.getAttribute('value'), '123');
    var reflowCount = reflowHelper.getCount();
    assert.equal(reflowCount, 3);
    reflowHelper.stopTracking();
  });

  test('Entering a digit in the middle of the number', function() {
    typeNumber();

    var number = subject.client.findElement(selectors.phoneNumber);
    number.scriptWith(function (numberElement) {
      numberElement.selectionStart = numberElement.selectionEnd = 1;
      numberElement.click();
    });

    var zero = subject.client.findElement(selectors.zero);
    keypadTap(zero);
    assert.equal(number.getAttribute('value'), '1023');
  });

  test('Replace a selection in the middle of the number', function() {
    typeNumber();

    var number = subject.client.findElement(selectors.phoneNumber);
    number.scriptWith(function (numberElement) {
      numberElement.selectionStart = 1;
      numberElement.selectionEnd = 2;
      numberElement.click();
    });

    var zero = subject.client.findElement(selectors.zero);
    keypadTap(zero);
    assert.equal(number.getAttribute('value'), '103');
  });

  test('Replace a selection in the middle of the number with a long press',
  function() {
    typeNumber();

    var number = subject.client.findElement(selectors.phoneNumber);
    number.scriptWith(function (numberElement) {
      numberElement.selectionStart = 1;
      numberElement.selectionEnd = 2;
      numberElement.click();
    });

    var zero = subject.client.findElement(selectors.zero);
    keypadTap(zero, true);
    assert.equal(number.getAttribute('value'), '1+3');
  });

  test('Entering a long press in the middle of the number', function() {
    typeNumber();

    var number = subject.client.findElement(selectors.phoneNumber);
    number.scriptWith(function (numberElement) {
      numberElement.selectionStart = numberElement.selectionEnd = 1;
      numberElement.click();
    });

    var zero = subject.client.findElement(selectors.zero);
    keypadTap(zero, true);
    assert.equal(number.getAttribute('value'), '1+23');
  });

  test('Entering a digit in the middle of a long number', function() {
    var insPosition = 3; // index where the cursor would be placed by the user
    var realInsPosition = insPosition + 2; // index inside the complete number
                                           // +2 for the space of the ellipsis

    var typedNumber = typeLongNumber();
    var numberAfterInsertion =
      typedNumber.substr(0, realInsPosition) + '0' +
      typedNumber.substr(realInsPosition);
    var expectedValueAfterInsertion =
      '\u2026' + numberAfterInsertion.substr(4); // 1 for the overflowing char,
                                                 // 2 for the ellipsis itself,
                                                 // 1 more for the new char.


    var number = subject.client.findElement(selectors.phoneNumber);
    var args = [number, insPosition];
    client.executeScript(function (numberElement, insPosition) {
      numberElement.selectionStart = numberElement.selectionEnd = insPosition;
      numberElement.click();
    }, args);

    var zero = subject.client.findElement(selectors.zero);
    keypadTap(zero);
    assert.equal(number.getAttribute('value'), expectedValueAfterInsertion);
  });

  test('Entering a long press in the middle of a long number', function() {
    var insPosition = 3; // index where the cursor would be placed by the user
    var realInsPosition = insPosition + 2; // index inside the complete number
                                           // +2 for the space of the ellipsis

    var typedNumber = typeLongNumber();
    var numberAfterInsertion =
      typedNumber.substr(0, realInsPosition) + '+' +
      typedNumber.substr(realInsPosition);
    var expectedValueAfterInsertion =
      '\u2026' + numberAfterInsertion.substr(4); // 1 for the overflowing char,
                                                 // 2 for the ellipsis itself,
                                                 // 1 more for the new char.


    var number = subject.client.findElement(selectors.phoneNumber);
    var args = [number, insPosition];
    client.executeScript(function (numberElement, insPosition) {
      numberElement.selectionStart = numberElement.selectionEnd = insPosition;
      numberElement.click();
    }, args);

    var zero = subject.client.findElement(selectors.zero);
    keypadTap(zero, true);
    assert.equal(number.getAttribute('value'), expectedValueAfterInsertion);
  });

  test('Using the special extention key', function() {
    var zero = subject.client.findElement(selectors.zero);
    var number = subject.client.findElement(selectors.phoneNumber);

    keypadTap(zero, true);
    assert.equal(number.getAttribute('value'), '+');
    keypadTap(zero, false);
    assert.equal(number.getAttribute('value'), '+0');
  });

  test('Deleting a digit', function() {
    typeNumber();

    var del = subject.client.findElement(selectors.del);
    actions.tap(del).perform();

    var number = subject.client.findElement(selectors.phoneNumber);
    client.waitFor(function() {
      return (number.getAttribute('value').length == 2);
    });
    assert.equal(number.getAttribute('value'), '12');
  });

  test('Deleting a digit in the middle of the number', function() {
    typeNumber();

    var number = subject.client.findElement(selectors.phoneNumber);
    number.scriptWith(function (numberElement) {
      numberElement.selectionStart = numberElement.selectionEnd = 2;
      numberElement.click();
    });

    var del = subject.client.findElement(selectors.del);
    actions.tap(del).perform();

    client.waitFor(function() {
      return (number.getAttribute('value').length == 2);
    });
    assert.equal(number.getAttribute('value'), '13');
  });

  test('Deleting a digit in the middle of a long number', function() {
    var delPosition = 3; // index where the cursor would be placed by the user
    var realDelPosition = delPosition + 2; // index inside the complete number
                                           // +2 for the space of the ellipsis

    var typedNumber = typeLongNumber();
    var expectedNumberAfterDeletion =
      typedNumber.substr(0, realDelPosition - 1) +
      typedNumber.substr(realDelPosition);

    var number = subject.client.findElement(selectors.phoneNumber);
    var args = [number, delPosition];
    client.executeScript(function (numberElement, delPosition) {
      numberElement.selectionStart = numberElement.selectionEnd = delPosition;
      numberElement.click();
    }, args);

    var del = subject.client.findElement(selectors.del);
    actions.tap(del).perform();
    client.waitFor(function() {
      return (number.getAttribute('value') == expectedNumberAfterDeletion);
    });
    assert.ok(true);
  });

  test('Deleting a couple of digits in the middle of the number', function() {
    typeNumber();

    var number = subject.client.findElement(selectors.phoneNumber);
    number.scriptWith(function (numberElement) {
      numberElement.selectionStart = numberElement.selectionEnd = 2;
      numberElement.click();
    });

    var del = subject.client.findElement(selectors.del);
    actions.doubleTap(del).perform();

    assert.equal(number.getAttribute('value'), '3');
  });

  test('Clearing the number partially by long pressing the delete key',
  function() {
    typeNumber();

    var number = subject.client.findElement(selectors.phoneNumber);
    number.scriptWith(function (numberElement) {
      numberElement.selectionStart = numberElement.selectionEnd = 2;
      numberElement.click();
    });

    var del = subject.client.findElement(selectors.del);
    actions.longPress(del, 1).perform();

    client.waitFor(function() {
      return (number.getAttribute('value') === '3');
    });
    assert.ok(true, 'cleaned the phone number view');
  });
});
