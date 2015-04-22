'use strict';
var Dialer = require('../lib/dialer');

marionette('Dialer > Navigation', function() {
  var assert = require('assert');

  var client = marionette.client(Dialer.config);
  var subject;
  var selectors;
  var actions;

  setup(function() {
    actions = client.loader.getActions();
    subject = new Dialer(client);
    subject.launch();

    selectors = Dialer.Selectors;

    var keypad = subject.client.findElement(selectors.keypadView);
    client.waitFor(function() {
      return keypad.displayed();
    });
  });

  test('Call Log', function() {
    var tabItem = subject.client.findElement(selectors.callLogTabItem);
    actions.tap(tabItem).perform();

    var callLogTabs = subject.client.findElement(selectors.callLogTabs);
    client.waitFor(function() {
      return callLogTabs.displayed();
    });
    assert.ok(true, 'displayed the call log tabs');
  });

  test('Contacts', function() {
    var tabItem = subject.client.findElement(selectors.contactsTabItem);
    actions.tap(tabItem).perform();

    var iframe = subject.client.findElement('#iframe-contacts');
    client.waitFor(function() {
      return iframe.displayed();
    });
    assert.ok(true, 'displayed the contacts iframe');
  });
});
