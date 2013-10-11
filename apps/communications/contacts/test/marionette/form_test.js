var Contacts = require('./lib/contacts');
var assert = require('assert');

marionette('Contacts > Form', function() {
  var client = marionette.client(Contacts.config);
  var subject;
  var selectors;

  setup(function() {
    subject = new Contacts(client);
    subject.launch();

    selectors = Contacts.Selectors;
  });

  suite('Click phone number', function() {
    test('Add a simple contact', function() {

      var givenName = 'Hello';
      var familyName = 'World';

      subject.addContact({
        givenName: givenName,
        familyName: familyName
      });

      var listView = client.helper.waitForElement(selectors.list);
      assert.ok(listView.displayed(), 'List view is shown.');

      var listElementText = client.helper
        .waitForElement(selectors.listContactFirst)
        .text();

      assert.notEqual(listElementText.indexOf(givenName), -1);
      assert.notEqual(listElementText.indexOf(familyName), -1);
    });

    test('Can create custom label', function() {
      subject.addContact({
        givenName: 'Custom Label Test',
        tel: 1231231234
      });

      client.helper.waitForElement(selectors.listContactFirstText)
        .click();

      client.helper.waitForElement(selectors.details);
      client.helper.waitForElement(selectors.detailsEditContact)
        .click();

      client.helper.waitForElement(selectors.formTelLabelFirst)
        .click();

      client.helper.waitForElement(selectors.formCustomTag)
        .sendKeys('BFF');

      client.helper.waitForElement(selectors.formCustomTagDone)
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
