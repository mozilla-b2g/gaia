function generatorTest() {
  // Launch the dialer app
  yield testApp('http://dialer.gaiamobile.org/', testContactsEdition);
}

function testContactsEdition(window, document, nextStep) {
  var contactTab = document.getElementById('contacts-label');
  EventUtils.sendMouseEvent({type: 'click'}, contactTab);

  // Waiting until the contacts are loaded
  yield until(function() window.Contacts && window.Contacts._loaded, nextStep);

  var details = window.ContactDetails;
  var contacts = window.Contacts;
  var overlay = details.overlay;

  // -- Creating a contact
  var addButton = document.getElementById('contact-add');
  overlay.addEventListener('transitionend', function trWait() {
    overlay.removeEventListener('transitionend', trWait);
    nextStep();
  });
  yield EventUtils.sendMouseEvent({type: 'click'}, addButton);

  var testNumber = '321-123-4242';

  // Filling the form
  details.contactGivenNameField.value = 'John';
  details.contactFamilyNameField.value = 'Appleseed';
  details.contactPhoneField.value = testNumber;
  details.contactEmailField.value = 'john@appleseed.com';

  // Saving the new contact
  var submitButton = details.view.querySelector('input[type="submit"]');
  EventUtils.sendMouseEvent({type: 'click'}, submitButton);

  yield until(function() !details.view.classList.contains('editing'), nextStep);

  // Closing the modal view
  overlay.addEventListener('transitionend', function trWait() {
    overlay.removeEventListener('transitionend', trWait);
    nextStep();
  });
  yield EventUtils.sendKey('ESCAPE', window);

  // Looking up the new contact in the mozContacts DB
  var foundContact;
  yield contacts.findByNumber(testNumber, function(contact) {
    foundContact = contact;
    nextStep();
  });

  var contactId = foundContact.id;
  var entry = document.getElementById(contactId);
  ok(entry != null, 'Entry for the contact created');
  ok(foundContact.name == 'John Appleseed', 'The contact name was set');


  // Showing the contact details
  overlay.addEventListener('transitionend', function trWait() {
    overlay.removeEventListener('transitionend', trWait);
    nextStep();
  });
  yield EventUtils.sendMouseEvent({type: 'click'}, entry);

  // -- Editing the new contact
  var editSelector = 'button[data-action="edit"]';
  var editButton = details.view.querySelector(editSelector);
  EventUtils.sendMouseEvent({type: 'click'}, editButton);

  ok(details.view.classList.contains('editing'),
     'In editing mode');

  var newNumber = '0112345678';
  details.contactPhoneField.value = newNumber;

  // Saving the changes
  EventUtils.sendMouseEvent({type: 'click'}, submitButton);
  yield until(function() !details.view.classList.contains('editing'), nextStep);

  // Closing the modal view
  overlay.addEventListener('transitionend', function trWait() {
    overlay.removeEventListener('transitionend', trWait);
    nextStep();
  });
  yield EventUtils.sendKey('ESCAPE', window);

  // Looking up the contact with the new number
  yield contacts.findByNumber(newNumber, function(contact) {
    foundContact = contact;
    nextStep();
  });

  ok(foundContact.id == contactId, 'Contact has been updated');

  // -- Deleting the contact
  entry = document.getElementById(contactId);
  overlay.addEventListener('transitionend', function trWait() {
    overlay.removeEventListener('transitionend', trWait);
    nextStep();
  });
  yield EventUtils.sendMouseEvent({type: 'click'}, entry);

  // Entering edit mode
  EventUtils.sendMouseEvent({type: 'click'}, editButton);

  var deleteSelector = 'button[data-action="destroy"]';
  var deleteButton = details.view.querySelector(deleteSelector);

  // Calling the delete action
  overlay.addEventListener('transitionend', function trWait() {
    overlay.removeEventListener('transitionend', trWait);
    nextStep();
  });
  yield EventUtils.sendMouseEvent({type: 'click'}, deleteButton);

  ok(!details.view.classList.contains('editing'),
     'Out of editing mode');

  entry = window.document.getElementById(contactId);
  ok(entry == null, 'Entry for the contact removed');
}
