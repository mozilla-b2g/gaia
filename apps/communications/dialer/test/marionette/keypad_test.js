'use strict';

var Dialer = require('./lib/dialer');
var ReflowHelper =
  require('../../../../../tests/js-marionette/reflow_helper.js');

marionette('Dialer > Keypad', function() {
  var assert = require('assert');

  var client = marionette.client(Dialer.config);
  var subject;
  var selectors;

  var Actions = require('marionette-client').Actions;
  var actions = new Actions(client);

  var reflowHelper;

  setup(function() {
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

  // FIXME Test disabled because of bug 986173
  // test('Entering a 3 digits number with the keypad', function() {
  //   reflowHelper.startTracking(Dialer.URL + '/manifest.webapp');
  //   typeNumber();

  //   var number = subject.client.findElement(selectors.phoneNumber);
  //   assert.equal(number.getAttribute('value'), '123');
  //   var reflowCount = reflowHelper.getCount();
  //   assert.equal(reflowCount, 16, 'you need more than 16 reflows for that?');
  //   reflowHelper.stopTracking();
  // });

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
