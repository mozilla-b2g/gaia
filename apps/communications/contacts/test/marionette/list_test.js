'use strict';

var Contacts = require('./lib/contacts');
var ContactsData = require('./lib/contacts_data');
var assert = require('assert');

marionette('Contacts > List', function() {
  var client = marionette.client({
    profile: Contacts.config,
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var subject;
  var selectors;
  var contactsData;
  var actions;

  var agenda = [{ givenName: 'a' }, { givenName: 'b' }, { givenName: 'c' },
                { givenName: 'd' }, { givenName: 'e' }, { givenName: 'f' },
                { givenName: 'g' }, { givenName: 'h' }, { givenName: 'i' }];

  function getNumberOfItemsVisited() {
    return client.executeScript(function() {
      return document.querySelectorAll('li[data-visited="true"]').length;
    });
  }

  setup(function() {
    contactsData = new ContactsData(client);
    actions = client.loader.getActions();
    subject = new Contacts(client);
    subject.launch();
  });

  suite('Visited contacts > ', function() {
    setup(function() {
      agenda.forEach(function(contact) {
        subject.addContact(contact);
      });
      selectors = Contacts.Selectors;
    });

    test('at least one has been visited by the imageLoader', function() {
      assert.ok(getNumberOfItemsVisited() > 0);
    });

    test('number of visited is the same after leaving search view', function() {
      var numItemsVisited = getNumberOfItemsVisited();
      client.findElement(selectors.searchLabel).click();
      client.helper.waitForElement(selectors.searchCancel).click();
      assert.ok(getNumberOfItemsVisited() === numItemsVisited);
    });
  });

  suite('Images in list > ', function() {
    // Generates 3 contacts for each letter with image
    function generateContactsWithImage() {
      for(var i = 0; i < 25; i++) {
        var name = '';
        var character = 97 + i;
        for (var j = 0; j < 3; j++) {
          name += String.fromCharCode(character);
          var contactData = {
            givenName: [name]
          };
          contactsData.createMozContact(contactData, true);
        }
      }
    }

    function firstContactHasImage() {
      return client.executeScript(function() {
        var span = document.querySelector(
          '#contacts-list-A .contact-item span');
        if (!span) {
          return false;
        }
        return span.dataset.src && span.style.backgroundImage !== null;
      });
    }

    function firstContactHasDefaultImage() {
      try {
        var span = client.findElement(
          '#contacts-list-A .contact-item span');
        return span.cssProperty('background-image') === 'url(' +
            '"app://communications.gaiamobile.org/contacts/' +
            'style/images/Imagery.png")';
      } catch (e) {
        return false;
      }
    }

    function checkLetterForElement(selector, letter) {
      try {
        var elem = client.findElement(selector);
        return elem.getAttribute('data-group') === letter;
      } catch (e) {
        return e.toString();
      }
    }

    suite('Default Images > ', function() {
      // Moztrap: https://moztrap.mozilla.org/manage/case/14399/
      test('contact with no picture show the default one', function() {
        subject.addContact({givenName: 'Anthony'});
        assert.ok(firstContactHasDefaultImage());
        assert.ok(checkLetterForElement('span[data-type="img"]', 'A'));
      });
    });

    suite('Contacts with images > ', function() {
      setup(function() {
        generateContactsWithImage();
      });

      test('after scrolling we keep the images', function() {
        // Scroll to different sections in the list
        var scrollbar = client.helper.waitForElement(
          Contacts.Selectors.scrollbar);
        //F
        actions.press(scrollbar, 15, 100).release().perform();
        client.helper.waitForElement(Contacts.Selectors.overlay);
        client.helper.waitForElementToDisappear(Contacts.Selectors.overlay);
        //T
        actions.press(scrollbar, 15, 300).release().perform();
        client.helper.waitForElement(Contacts.Selectors.overlay);
        client.helper.waitForElementToDisappear(Contacts.Selectors.overlay);
        //X
        actions.press(scrollbar, 15, 350).release().perform();
        client.helper.waitForElement(Contacts.Selectors.overlay);
        client.helper.waitForElementToDisappear(Contacts.Selectors.overlay);
        //A
        actions.press(scrollbar, 15, 40).release().perform();
        client.helper.waitForElement(Contacts.Selectors.overlay);
        client.helper.waitForElementToDisappear(Contacts.Selectors.overlay);

        assert.ok(firstContactHasImage());
      });
    });
  });
});
