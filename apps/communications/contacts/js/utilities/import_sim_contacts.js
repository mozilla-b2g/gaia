/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Imports contacts stored in the SIM card and saves them into
 * navigator.mozContacts. Three steps => three callback as arguments:
 *   - onread: SIM card has been read properly;
 *   - onimport: contacts have been saved into navigator.mozContacts;
 *   - onerror: SIM card us empty or could not be read.
 */

function importSIMContacts(onread, onimport, onerror) {
  if (!window.navigator.mozContacts)
    return;

  // request contacts with getSimContacts() -- valid types are:
  //   'ADN': Abbreviated Dialing Numbers
  //   'FDN': Fixed Dialing Numbers
  var request = navigator.mozContacts.getSimContacts('ADN');

  request.onsuccess = function onsuccess() {
    var simContacts = request.result; // array of mozContact elements
    var nContacts = simContacts.length;

    // early way out if no contacts have been found
    if (nContacts === 0) {
      if (onimport) {
        onimport(0);
      }
      return;
    }

    // if we're here, all SIM contacts have been read
    if (onread) {
      onread();
    }

    // count saved contacts, trigger 'onimport' when done
    var nStored = 0;
    var count = function count() {
      nStored++;
      if (onimport && nStored >= nContacts) {
        onimport(nContacts);
      }
    };

    /**
     * store mozContact elements -- each returned mozContact has two properties:
     *   .name : [ string ]
     *   .tel  : [{ number: string, type: string }]
     * The 'name' property is only related to the mozContact element itself --
     * let's use it as the default 'givenName' value.
     */
    for (var i = 0; i < nContacts; i++) {
      simContacts[i].givenName = simContacts[i].name;
      var req = window.navigator.mozContacts.save(simContacts[i]);
      req.onsuccess = count;
      req.onerror = count;
    }
  };

  request.onerror = onerror;
}

