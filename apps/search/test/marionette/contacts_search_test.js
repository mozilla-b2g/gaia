'use strict';

var Rocketbar = require('../../../system/test/marionette/lib/rocketbar.js');
var Contacts = require(
  '../../../communications/contacts/test/marionette/lib/contacts');
var assert = require('assert');

marionette('Search - Contact search', function() {
  var client = marionette.client();

  var contacts, search, rocketbar;

  setup(function() {
    rocketbar = new Rocketbar(client);
    contacts = new Contacts(client);
    search = client.loader.getAppClass('search');
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
