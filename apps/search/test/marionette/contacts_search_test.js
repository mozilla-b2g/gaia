'use strict';

var Search = require('./lib/search');
var Contacts = require(
  '../../../communications/contacts/test/marionette/lib/contacts');
var assert = require('assert');

marionette('contact search', function() {
  var client = marionette.client(Search.ClientOptions);

  var contacts;
  var search;

  setup(function() {
    contacts = new Contacts(client);
    search = new Search(client);
  });

  test.skip('able to search contact from rocketbar', function() {
    var contactTel = 1231231234;
    contacts.launch();
    contacts.addContact({
      givenName: 'HelloWorld',
      tel: contactTel
    });
    client.apps.close(Contacts.URL, 'contacts');

    client.switchToFrame();

    search.doSearch('HelloWorld');

    search.goToResults();

    search.checkResult('firstContact', 'HelloWorld');

    search.goToApp(Contacts.URL, 'contacts');

    var firstTel = client.helper
      .waitForElement(Contacts.Selectors.detailsTelButtonFirst);
    assert.equal(firstTel.text(), contactTel);
  });

});
