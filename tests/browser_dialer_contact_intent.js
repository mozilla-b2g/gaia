function generatorTest() {
  yield testApp('../dialer/dialer.html', testContactIntent);
}

function testContactIntent(window, document, nextStep) {

  // creating a contact
  var testContact = new mozContact();
  testContact.init({
    givenName: 'Andreas',
    familyName: 'Gal',
    name: 'Andreas Gal'
  });

  yield navigator.mozContacts.save(testContact).onsuccess = nextStep;


  var fakeEvt = {
    data: {
      hidden: false
    }
  };
  window.visibilityChanged('../dialer/dialer.html?choice=contact', fakeEvt);

  ok(!document.getElementById('contacts-view').hidden,
     'Contact view displayed');

  yield until(function() window.Contacts && window.Contacts._loaded, nextStep);

  var containerId = 'contacts-container';
  var container = document.getElementById(containerId);
  ok(container.children.length > 0, 'Contacts displayed');

  navigator.mozContacts.remove(testContact);
}
