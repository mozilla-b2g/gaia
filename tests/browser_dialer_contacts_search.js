function generatorTest() {
  // Add a new contact to the database
  var testContact = new mozContact({
    givenName: ['Kennedy'],
    familyName: ['Cooley'],
    name: ['Kennedy Cooley']
  });

  // Save the contact, and yield until the save is done
  yield navigator.mozContacts.save(testContact).onsuccess = nextStep;

  // Launch the dialer app
  yield testApp('http://dialer.gaiamobile.org/', testContactsSearch);

  // Remove the contact
  navigator.mozContacts.remove(testContact);
}

function testContactsSearch(window, document, nextStep) {
  // Click on the contacts tab of the dialer
  var contactTab = document.getElementById('contacts-label');
  EventUtils.sendMouseEvent({type: 'click'}, contactTab);

  // And wait until the app API is ready
  yield until(function() window.Contacts && window.Contacts._loaded, nextStep);

  var contactsView = document.getElementById('contacts-view');
  var displayedContacts = contactsView.querySelectorAll('.contact');
  var contactElement = null;
  for (var i = 0; i < displayedContacts.length; i++) {
    if (displayedContacts[i].textContent == 'Kennedy Cooley') {
      contactElement = displayedContacts[i];
      break;
    }
  }
  ok(contactElement != null, 'Test contact displayed at first');

  // focus the search field and wait until it actually has focus
  var searchField = document.getElementById('contacts-search');
  searchField.focus();
  yield until(function() document.activeElement === searchField, nextStep);

  searchField.value = '';
  EventUtils.sendString('aaar');
  ok(contactElement.hidden, 'Test contact hidden when no match');

  searchField.value = '';
  EventUtils.sendString('coo');
  ok(!contactElement.hidden,
     'Test contact displayed when matching on family name');

  searchField.value = '';
  EventUtils.sendString('enn');
  ok(!contactElement.hidden,
     'Test contact displayed when matching on given name');

}
