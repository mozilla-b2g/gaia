function generatorTest() {
  // Create a test contact
  var testContact = new mozContact({
    givenName: ['Tom'],
    familyName: ['Testing'],
    name: ['Tom Testing'],
    tel: [{value:'123-456-789'}]
  });

  yield navigator.mozContacts.save(testContact).onsuccess = nextStep;
  yield testApp('http://dialer.gaiamobile.org/', testCallFromContacts);
  yield navigator.mozContacts.remove(testContact).onsuccess = nextStep;
}

function testCallFromContacts(window, document, nextStep) {
  var keyboardTab = document.getElementById('keyboard-label');
  EventUtils.sendMouseEvent({type: 'click'}, keyboardTab);

  var contactTab = document.getElementById('contacts-label');
  EventUtils.sendMouseEvent({type: 'click'}, contactTab);

  ok(!document.getElementById('contacts-view').hidden,
     'Contact view displayed');

  // Wait for at least one contact to be displayed
  var contactsList = document.getElementById('contacts-container');
  yield until(function() contactsList.querySelector('.contact'), nextStep);

  var aContact = contactsList.querySelector('.contact');
  var overlay = window.ContactDetails.overlay;
  EventUtils.sendMouseEvent({type: 'click'}, aContact);
  yield until(function() overlay.classList.contains('displayed'), nextStep);
  ok(overlay.classList.contains('displayed'), 'Overlay view displayed');

  var number = window.ContactDetails.contactPhone;
  var callScreen = window.CallHandler.callScreen;
  EventUtils.sendMouseEvent({type: 'click'}, number);
  yield until(function() callScreen.classList.contains('oncall'), nextStep);
  ok(callScreen.classList.contains('oncall'), 'CallScreen displayed');
}
