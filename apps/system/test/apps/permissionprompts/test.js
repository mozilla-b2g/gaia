'use strict';

function getDeviceStorageFile(type) {
  var storage = navigator.getDeviceStorage(type);
  storage.get('fake.fak');
}

window.addEventListener('load', function() {
  // Save a contact to prompt for contacts permission.
  document.getElementById('contacts').onclick = function() {
    var person = new window.mozContact();
    navigator.mozContacts.save(person);
  };

  var storageTypes = ['sdcard', 'music', 'pictures', 'videos'];
  storageTypes.forEach(function(type) {
    var el = document.getElementById(type);
    el.onclick = getDeviceStorageFile.bind(this, type);
  });

  document.querySelector('body').classList.add('loaded');
});
