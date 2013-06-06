requireApp('communications/contacts/js/mock_contacts_index.html.js');
requireApp('communications/contacts/js/navigation.js');

suite('contacts/navigation', function() {

  suiteSetup(function() {
    document.body.innerHTML = MockContactsIndexHtml;
    var navigation = new navigationStack('view-contacts-list');
    var viewContactList = document.getElementById('view-contacts-list');
    var viewContactForm = document.getElementById('view-contact-form');
  });

  suite('go from contact list to form', function () {
    navigation.go('view-contact-form', 'popup');

  })

});