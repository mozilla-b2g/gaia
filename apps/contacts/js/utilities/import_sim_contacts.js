/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Imports contacts stored in the SIM card and saves them into
 * navigator.mozContacts. Three steps => three callbacks:
 *   - onread: SIM card has been read properly;
 *   - onimport: contacts have been saved into navigator.mozContacts;
 *   - onerror: SIM card could not be read.
 */

function importSIMContacts(onread, onimport, onerror) {
  if (!window.navigator.mozContacts)
    return;

  // request contacts with getSimContacts() -- valid types are:
  //   'ADN': Abbreviated Dialing Numbers
  //   'FDN': Fixed Dialing Numbers
  var request = navigator.mozContacts.getSimContacts('ADN');

  request.onsuccess = function onsuccess() {
    if (onread) {
      onread();
    }

    var simContacts = request.result;
    var nContacts = request.result.length;
    var nStored = 0;
    var count = function count() {
      nStored++;
      if (onimport && nStored >= nContacts) {
        onimport();
      }
    };

    for (var i = 0; i < nContacts; i++) {
      // https://bugzilla.mozilla.org/show_bug.cgi?id=779794
      // in a perfect world, request.result should be a mozContact array;
      // until then, let's build mozContact elements manually...
      var contact = new mozContact();
      var name = simContacts[i].name ? [simContacts[i].name] : [];
      var note = simContacts[i].note ? [simContacts[i].note] : [];
      var tel = simContacts[i].tel ? [{
        'number': simContacts[i].tel.toString(),
        'type': 'personal'
      }] : [];

      contact.init({
        'name': name,
        'givenName': name,
        'tel': tel,
        'note': note
      });

      // store each mozContact
      var req = window.navigator.mozContacts.save(contact);
      req.onsuccess = count;
      req.onerror = count;
    }
  };

  request.onerror = onerror;
}

