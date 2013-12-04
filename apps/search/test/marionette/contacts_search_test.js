var Search = require('./lib/search');
var Contacts = require(
  '../../../communications/contacts/test/marionette/lib/contacts');
var assert = require('assert');

marionette('contact search', function() {
  var client = marionette.client({
    settings: {
      'keyboard.ftu.enabled': false,
      'rocketbar.enabled': true
    }
  });

  var contacts;

  setup(function() {
    contacts = new Contacts(client);
  });

  test('able to search contact from rocketbar', function() {
    contacts.launch();
    contacts.addContact({
      givenName: 'HelloWorld',
      tel: 1231231234
    });
    client.apps.close(Contacts.URL, 'contacts');

    client.switchToFrame();

    client.helper.waitForElement(Search.Selectors.statusBar).click();

    var resultsFrame = client.helper
      .waitForElement(Search.Selectors.searchInput);

    client.helper.waitForElement(Search.Selectors.searchInput)
      .sendKeys('HelloWorld');

    client.switchToFrame(resultsFrame);

    var result = client.helper.waitForElement(Search.Selectors.firstContact);

    assert.equal('HelloWorld', result.text());

    result.click();

    client.switchToFrame();
    client.apps.switchToApp(Contacts.URL, 'contacts');

    client.helper.waitForElement('body');
  });

});
