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
    selectors = Contacts.Selectors;
  });

  suite('Visited contacts > ', function() {
    setup(function() {
      agenda.forEach(function(contact) {
        subject.addContact(contact);
      });
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

  suite('List Order > ', function() {
    var data = [['GG', 'E'], ['AA', 'Z'],
      ['XX', 'C'], ['CC', 'X'], ['EE', 'G'], ['FF', 'F'], ['HH', 'D'],
      ['BB', 'Y'], ['YY', 'B'], ['ZZ', 'A'], ['DD', 'H']];
    setup(function() {
      data.forEach(contactData => {
        contactsData.createMozContact({
          givenName: [contactData[0]],
          familyName: [contactData[1]]
        }, false);
      });
    });

    

    function givenNameOrder(a, b) {
      return a[0].localeCompare(b[0]);
    }

    function familyNameOrder(a, b) {
      return a[1].localeCompare(b[1]);
    }

    test('Default to: given name > ', function() {
      var names = subject.contactsNames;
      var targetOrder = data.sort(givenNameOrder);
      names.forEach((name, index) => {
        assert.equal(name, targetOrder[index][0] + ' ' + targetOrder[index][1]);
      });
    });

    test('Order by family name > ', function() {
      subject.goToSettings();

      // Change order
      client.switchToShadowRoot(
        client.helper.waitForElement(selectors.orderSwitch));
      subject.clickOn(client.findElement(selectors.changeOrder));
      client.switchToShadowRoot();
      subject.clickOn(client.findElement(selectors.settingsClose));
      subject.waitForFadeIn(client.helper.waitForElement(selectors.list));

      var names = subject.contactsNames;
      var targetOrder = data.sort(familyNameOrder);
      names.forEach((name, index) => {
        assert.equal(name, targetOrder[index][0] + ' ' + targetOrder[index][1]);
      });

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
