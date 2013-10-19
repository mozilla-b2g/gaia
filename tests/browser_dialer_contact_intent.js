function generatorTest() {
  // creating a contact
  var testContact = new mozContact({
    givenName: ['Andreas'],
    familyName: ['Gal'],
    name: ['Andreas Gal']
  });
  yield navigator.mozContacts.save(testContact).onsuccess = nextStep;

  yield testApp('http://dialer.gaiamobile.org/', testContactIntent);

  yield navigator.mozContacts.remove(testContact).onsuccess = nextStep;
}

function testContactIntent(window, document, nextStep) {
  var fakeEvt = {
    data: {
      hidden: false
    }
  };
  window.visibilityChanged('http://dialer.gaiamobile.org/index.html?choice=contact', fakeEvt);

  ok(!document.getElementById('contacts-view').hidden,
     'Contact view displayed');

  yield until(function() window.Contacts && window.Contacts._loaded, nextStep);

  var containerId = 'contacts-container';
  var container = document.getElementById(containerId);
  ok(container.children.length > 0, 'Contacts displayed');
}
