'use strict';

window.addEventListener('load', function() {
  // Save a contact to prompt for contacts permission.
  document.getElementById('contacts').onclick = function() {
    var person = new window.mozContact();
    navigator.mozContacts.save(person);
  };
  document.querySelector('body').classList.add('loaded');
});
