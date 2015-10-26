'use strict';

var APP_URL = 'app://smart-home.gaiamobile.org';

var Keys = {
  'up': '\ue013',
  'right': '\ue014',
  'down': '\ue015',
  'left': '\ue012',
  'enter': '\ue006',
  'esc': '\ue00c'
};

var assert = require('chai').assert;

var containsClass = function(elem, className) {
  if (elem) {
    return elem.getAttribute('class').indexOf(className) > -1;
  }
  return false;
};

// Bug 1207453 - Skip the test due to unknown test enviroment issue for now.
// We should investigate the issue and re-enable the test later.
marionette.skip('Smart Home', function() {

  var opts = {
    hostOptions: {
      screen: {
        width: 1920,
        height: 1080
      }
    }
  };

  var client = marionette.client({
    profile: opts,
    // XXX: Set this to true once Accessibility is implemented in TV
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  setup(function() {
    // Launch test app
    client.apps.launch(APP_URL);
    client.apps.switchToApp(APP_URL);
  });

  suite('> Card Filter', function() {
    test('Hide card filter when enter edit mode and show card filter when' +
        ' exit edit mode ', { devices: ['tv'] }, function () {

      var editButton = client.findElement('#edit-button');
      var element = client.findElement('#main-section');
      var searchButton = client.findElement('#search-button');
      var deckTvCard = client.findElement('#card-list > .card');
      var deckTvButton = client.findElement('.app-button.deck-tv');

      client.waitFor(function() {
        return containsClass(deckTvCard, 'focused');
      });
      client.waitFor(function() {
        return containsClass(deckTvButton, 'focused');
      });

      element.sendKeys(Keys.up);
      client.waitFor(function() {
        return containsClass(searchButton, 'focused');
      });

      element.sendKeys(Keys.right);
      client.waitFor(function() {
        return containsClass(editButton, 'focused');
      });

      element.sendKeys(Keys.enter);
      client.waitFor(function() {
        return element.getAttribute('data-mode') === 'edit';
      });
      var cardFilter = client.findElement('#filter-tab-group');
      assert.isTrue(containsClass(cardFilter, 'hidden'));

      element.sendKeys(Keys.up);
      element.sendKeys(Keys.enter);
      assert.isFalse(containsClass(cardFilter, 'hidden'));
    });

    test('Collapse folder when filter is focused',
        { devices: ['tv'] }, function() {

      // add new folder
      client.executeScript(function() {
        var home = window.wrappedJSObject.home;
        var newFolder = home.cardManager.insertNewFolder({id: 'new-folder'},
          home.cardManager._cardList.length);
        var card = home.cardManager._deserializeCardEntry({group: 'application',
          manifestURL: 'app://tv-epg.gaiamobile.org/manifest.webapp',
          type: 'Application'
        });
        newFolder.addCard(card);
      });

      var element = client.findElement('#main-section');
      var newFolderCard =
        client.findElement('#card-list div.card:last-child');
      client.waitFor(function() {
        return containsClass(newFolderCard, 'focused');
      });

      // move focus to card filter
      element.sendKeys(Keys.down);
      element.sendKeys(Keys.down);

      // wait until animation of card filter ends
      var cardFilter = client.findElement('#filter-tab-group');
      client.waitFor(function() {
        return !containsClass(cardFilter, 'closed');
      });

      // wait for folder to be collapsed
      client.helper.waitForElementToDisappear('#folder-list .card');
    });
  });

});
