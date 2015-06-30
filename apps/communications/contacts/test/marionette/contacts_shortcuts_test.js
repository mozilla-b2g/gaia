'use strict';

var Contacts = require('./lib/contacts');
var assert = require('assert');

marionette('Contacts shortcuts > touch', function() {
  var client = marionette.client({
    profile: Contacts.config,
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });
  var subject;
  var selectors;
  var actions;
  var scrollbar;
  var overlay;

  function overlayOpacity() {
    return subject.getElementStyle(selectors.overlay, 'opacity');
  }

  setup(function() {
    actions = client.loader.getActions();
    subject = new Contacts(client);
    subject.launch();

    selectors = Contacts.Selectors;
    subject.addContact();
    scrollbar = client.helper.waitForElement(selectors.scrollbar);
  });

  // Disabled bug 1023908
  suite('touch on shortcuts', function() {
    test('press/release on scrollbar should show/hide shortcut', function() {
      var action = actions.press(scrollbar, 10, 100).perform();
      overlay = client.helper.waitForElement(selectors.overlay);
      assert.equal(overlay.text().length, 1);
      assert.equal(overlayOpacity(), '1');
      action.release().perform();
      assert.equal(overlay.text().length, 0);
      assert.equal(overlayOpacity(), '0');
    });

    // Disabled bug 1005708
    test.skip('shortcut text should change after moving some distance',
      function() {
      var letter, nextLetter, lastLetter;

      var action = actions.press(scrollbar, 10, 100).perform();
      overlay = client.helper.waitForElement(selectors.overlay);
      letter = overlay.text();
      assert.equal(letter.length, 1);

      action.moveByOffset(0, 1).perform();
      nextLetter = overlay.text();
      assert.equal(nextLetter.length, 1);
      assert.equal(letter, nextLetter);

      action.moveByOffset(0, 50).perform();
      lastLetter = overlay.text();
      assert.equal(nextLetter.length, 1);
      assert.notEqual(lastLetter, nextLetter);

      action.release().perform();
    });

    test('pressing near the last release position should show valid shortcut',
      function() {
      actions.press(scrollbar, 15, 100).release().perform();

      var action = actions.press(scrollbar, 15, 100).perform();
      overlay = client.helper.waitForElement(selectors.overlay);
      assert.equal(overlay.text().length, 1);
      action.release().perform();
    });

    test('pressing outside the scrollbar should not show shortcut',
      function() {
      var action = actions.press(scrollbar, -1, 200).perform();

      assert.notEqual(overlayOpacity(), '1');
      action.release().perform();
    });
  });

});
