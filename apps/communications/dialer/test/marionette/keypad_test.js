'use strict';

var Dialer = require('./lib/dialer');

marionette('Dialer > Keypad', function() {
  var assert = require('assert');

  var client = marionette.client(Dialer.config);
  var subject;
  var selectors;

  var Actions = require('marionette-client').Actions;
  var actions = new Actions(client);

  setup(function() {
    subject = new Dialer(client);
    subject.launch();

    selectors = Dialer.Selectors;

    var keypad = subject.client.findElement(selectors.keypadView);
    client.waitFor(function() {
      return keypad.displayed();
    });
  });

  function typeNumber() {
    var one = subject.client.findElement(selectors.one);
    var two = subject.client.findElement(selectors.two);
    var three = subject.client.findElement(selectors.three);

    keypadTap(one);
    keypadTap(two);
    keypadTap(three);
  }

  function keypadTap(elem, longPress) {
    var number = subject.client.findElement(selectors.phoneNumber);
    var length = number.getAttribute('value').length;

    if (longPress) {
      actions.longPress(elem, 1).perform();
    } else {
      actions.tap(elem).perform();
    }

    client.waitFor(function() {
      return (number.getAttribute('value').length == (length + 1));
    });
  }

  test('Entering a number with the keypad', function() {
    typeNumber();

    var number = subject.client.findElement(selectors.phoneNumber);
    assert.equal(number.getAttribute('value'), '123');
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

  test('Clearing the number by long pressing the delete key', function() {
    typeNumber();

    var del = subject.client.findElement(selectors.del);
    actions.longPress(del, 1).perform();

    var number = subject.client.findElement(selectors.phoneNumber);
    client.waitFor(function() {
      return (number.getAttribute('value') === '');
    });
    assert.ok(true, 'cleaned the phone number view');
  });
});
