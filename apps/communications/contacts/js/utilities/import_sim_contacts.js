/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Imports contacts stored in the SIM card and saves them into
 * navigator.mozContacts. Three steps => three callback as arguments:
 *   - onread: SIM card has been read properly;
 *   - onimport: A Contact has been imported
 *   - onfinish: contacts have been saved into navigator.mozContacts;
 *   - onerror: SIM card us empty or could not be read.
 */

function SimContactsImporter() {
  var pointer = 0;
  var CHUNK_SIZE = 5;
  var numResponses = 0;
  var self = this;
  var _ = navigator.mozL10n.get;

  function continueCb() {
    numResponses++;
    pointer++;
    if (typeof self.onimported === 'function') {
      window.setTimeout(self.onimported, 0);
    }
    if (pointer < self.items.length && numResponses === CHUNK_SIZE) {
      numResponses = 0;
      importSlice(pointer);
    }
    else if (pointer >= self.items.length) {
      if (typeof self.onfinish === 'function') {
        self.onfinish();
      }
    }
  }

  function startMigration() {
    if (Array.isArray(self.items) && self.items.length > 0) {
      importSlice(0);
    }
    else {
      if (typeof self.onfinish === 'function') {
        self.onfinish();
      }
    }
  }

  this.start = function() {
    // request contacts with getSimContacts() -- valid types are:
    //   'ADN': Abbreviated Dialing Numbers
    //   'FDN': Fixed Dialing Numbers
    var request = navigator.mozContacts.getSimContacts('ADN');

    request.onsuccess = function onsuccess() {
      self.items = request.result; // array of mozContact elements
      if (typeof self.onread === 'function') {
        // This way the total number can be known by the caller
        self.onread(self.items.length);
      }
      startMigration();
    };

    request.onerror = function error() {
      if (typeof self.onerror === 'function') {
        self.onerror(request.error);
      }
    };
  };

  /**
   * store mozContact elements -- each returned mozContact has two properties:
   *   .name : [ string ]
   *   .tel  : [{ number: string, type: string }]
   * The 'name' property is only related to the mozContact element itself --
   * let's use it as the default 'givenName' value.
   */
  function importSlice(from) {
    for (var i = from; i < from + CHUNK_SIZE && i < self.items.length; i++) {
      var item = self.items[i];
      item.givenName = item.name;
      for (var j = 0; j < item.tel.length; j++) {
        item.tel[j].type = _('mobile');
      }
      var req = window.navigator.mozContacts.save(item);
      req.onsuccess = function saveSuccess() {
        continueCb();
      };
      req.onerror = function saveError() {
        console.error('SIM Import: Error importing ', item.id);
        continueCb();
      };
    }
  } // importSlice
}
