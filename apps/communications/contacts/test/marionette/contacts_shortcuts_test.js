'use strict';

var Contacts = require('./lib/contacts');
var assert = require('assert');
var Actions = require('marionette-client').Actions;

marionette('Contacts shortcuts > touch', function() {
  var config = Contacts.config;
  config.prefs = {
    'dom.w3c_touch_events.enabled': 1
  };
  var client = marionette.client(config);
  var subject;
  var selectors;
  var actions = new Actions(client);

  var scrollbar,
      overlay;

  function overlayOpacity() {
    return subject.getElementStyle(selectors.overlay, 'opacity');
  }

  setup(function() {
    subject = new Contacts(client);
    subject.launch();

    selectors = Contacts.Selectors;
    subject.addContact();
    scrollbar = client.helper.waitForElement(selectors.scrollbar);
  });

  suite('touch on shortcuts', function() {
    test('press/release on scrollbar should show/hide shortcut', function() {
      var act = actions.press(scrollbar, 10, 200).perform();
      overlay = client.helper.waitForElement(selectors.overlay);
      assert.equal(overlay.text().length, 1);
      assert.equal(overlayOpacity(), '1');
      act.release().perform();
      assert.equal(overlay.text().length, 0);
      assert.equal(overlayOpacity(), '0');
    });

    test('shortcut text should change after move some distance', function() {
      var ch, nextCh, lastCh;

      var act = actions.press(scrollbar, 10, 100).perform();
      overlay = client.helper.waitForElement(selectors.overlay);
      ch = overlay.text();
      assert.equal(ch.length, 1);

      act.moveByOffset(0, 1).perform();
      nextCh = overlay.text();
      assert.equal(nextCh.length, 1);
      assert.equal(ch, nextCh);

      act.moveByOffset(0, 50).perform();
      lastCh = overlay.text();
      assert.equal(nextCh.length, 1);
      assert.notEqual(lastCh, nextCh);

      act.release().perform();
    });

    test('Press near the last release position should show valid shortcut',
      function() {
      actions.press(scrollbar, 10, 200).release().perform();

      var act = actions.press(scrollbar, 10, 200).perform();
      overlay = client.helper.waitForElement(selectors.overlay);
      assert.equal(overlay.text().length, 1);
      act.release().perform();
    });

    test('Press outside the scrollbar should not show shortcut',
      function() {
      var act = actions.press(scrollbar, -1, 200).perform();

      assert.notEqual(overlayOpacity(), '1');
      act.release().perform();
    });
  });

});
