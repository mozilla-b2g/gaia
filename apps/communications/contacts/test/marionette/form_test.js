var Contacts = require('./lib/contacts');
var assert = require('assert');

marionette('Contacts > Form', function() {
  var client = marionette.client();
  var subject;
  var selectors;

  setup(function() {
    subject = new Contacts(client);
    subject.launch();

    selectors = Contacts.Selectors;
  });

  suite('Add a new contact', function() {
    test('Add a simple contact', function() {

      var givenName = 'Hello';
      var familyName = 'World';

      subject.addContact({
        givenName: givenName,
        familyName: familyName
      });

      assert.ok(true, 'Returned to list view.');

      var listElementText = client.findElement(selectors.listContactFirst)
        .text();
      assert.notEqual(listElementText.indexOf(givenName), -1);
      assert.notEqual(listElementText.indexOf(familyName), -1);
    });

    test('Can create custom label', function() {
      subject.addContact({
        givenName: 'Custom Label Test',
        tel: 1231231234
      });

      client.helper.waitForElement(selectors.listContactFirst);
      client.findElement(selectors.listContactFirst)
        .click();

      client.helper.waitForElement(selectors.detailsEditContact);
      client.findElement(selectors.detailsEditContact)
        .click();

      client.helper.waitForElement(selectors.formTelLabelFirst);
      client.findElement(selectors.formTelLabelFirst)
        .click();

      client.helper.waitForElement(selectors.formCustomTag);
      var customtag = client.findElement(selectors.formCustomTag);
      customtag.sendKeys('BFF');

      client.helper.waitForElement(selectors.formCustomTagDone);
      client.findElement(selectors.formCustomTagDone)
        .click();

      // Wait for the custom tag page to disappear
      client.waitFor(function waiting() {
        var tagPage = client.findElement(selectors.formCustomTagPage);
        var className = tagPage.getAttribute('className');
        return className.indexOf('app-go-left-in') === -1;
      });

      client.findElement(selectors.formSave)
        .click();

      client.helper.waitForElement(selectors.detailsTelLabelFirst);
      client.waitFor(function waiting() {
        var label = client.findElement(selectors.detailsTelLabelFirst).text();
        return label === 'BFF';
      });
      assert.ok(true, 'custom label is updated.');
    });

  });

});
