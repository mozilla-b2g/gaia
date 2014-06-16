/*jshint loopfunc: true */
/* global mozContact, LazyLoader, utils, contacts */
/* exported SimContactsImporter */
/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Imports contacts stored in the SIM card and saves them into
 * navigator.mozContacts. Three steps => three callback as arguments:
 *   - onread: SIM card has been read properly;
 *   - onimport: A Contact has been imported
 *   - onfinish: contacts have been saved into navigator.mozContacts;
 *   - onerror: SIM card is empty or could not be read.
 */

function SimContactsImporter(targetIcc) {
  if (targetIcc === null) {
    throw new Error('We need an icc to continue with this operation');
  }
  var pointer = 0;
  var CHUNK_SIZE = 5;
  var numResponses = 0;
  var self = this;
  var mustFinish = false;
  var loadedMatch = false;
  var DEFAULT_TEL_TYPE = 'other';
  var icc = targetIcc;
  var iccId = icc.iccInfo && icc.iccInfo.iccid;

  var numDupsMerged = 0;

  function generateIccContactUrl(contactid) {
    var urlValue = 'urn:' + 'uuid:' + (iccId || 'iccId') + '-' + contactid;
    return [{
      type: ['source', 'sim'],
      value: urlValue
    }];
  }

  function notifyFinish() {
    if (typeof self.onfinish === 'function') {
      window.setTimeout(self.onfinish, 0);
    }
  }

  function notifyImported() {
    if (typeof self.onimported === 'function') {
      window.setTimeout(self.onimported, 0);
    }
  }

  function continueCb() {
    numResponses++;
    pointer++;
    notifyImported();
    if (pointer < self.items.length && numResponses === CHUNK_SIZE) {
      numResponses = 0;
      mustFinish ? notifyFinish() : importSlice(pointer);
    }
    else if (pointer >= self.items.length) {
      notifyFinish();
    }
  }

  function startMigration() {
    if (!mustFinish && Array.isArray(self.items) && self.items.length > 0) {
      importSlice(0);
    }
    else {
      notifyFinish();
    }
  }

  function onContactsReadyForImport() {
    if (typeof self.onread === 'function') {
      // This way the total number can be known by the caller
      self.onread(self.items.length);
    }

    if (loadedMatch) {
      startMigration();
    }
    else {
      document.addEventListener('matchLoaded', function mloaded() {
        document.removeEventListener('matchLoaded', mloaded);
        startMigration();
      });
    }
  }

  this.start = function() {
    numDupsMerged = 0;
    
    if (mustFinish) {
      notifyFinish();
      return;
    }

    LazyLoader.load([
      '/shared/js/simple_phone_matcher.js',
      '/shared/js/contacts/contacts_matcher.js',
      '/shared/js/contacts/contacts_merger.js',
      '/shared/js/contacts/utilities/image_thumbnail.js',
      '/shared/js/contacts/merger_adapter.js'
    ], function loaded() {
      loadedMatch = true;
      document.dispatchEvent(new CustomEvent('matchLoaded'));
    });

    var requestAdn, requestSdn;

    // request contacts with readContacts() -- valid types are:
    //   'adn': Abbreviated Dialing Numbers
    //   'fdn': Fixed Dialing Numbers
    //   'sdn': Service Dialing Numbers
    if (icc && icc.readContacts) {
      requestAdn = icc.readContacts('adn');
    } else {
      throw new Error('Not able to obtain a SIM import function from platform');
    }

    requestAdn.onsuccess = function onsuccess() {
      if (mustFinish) {
        notifyFinish();
        return;
      }
      self.items = requestAdn.result || [];

      requestSdn = icc.readContacts('sdn');
      requestSdn.onsuccess = function onsuccess() {
        if (mustFinish) {
          notifyFinish();
          return;
        }

        if (Array.isArray(requestSdn.result)) {
          self.items = self.items.concat(requestSdn.result);
        }
        onContactsReadyForImport();
      };
      requestSdn.onerror = function error() {
        if (mustFinish) {
          notifyFinish();
          return;
        }
        console.warn('Could not read SDN Contacts from SIM Card', error.name);
        onContactsReadyForImport();
      };

    };
    requestAdn.onerror = function error() {
      if (typeof self.onerror === 'function') {
        self.onerror(requestAdn.error);
      }
    };
  };

  this.finish = function() {
    mustFinish = true;
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
      var parsedName = utils.misc.parseName(item.name[0]);
      item.givenName = [parsedName.givenName];
      item.familyName = [parsedName.familyName];

      if (Array.isArray(item.tel)) {
        var telItems = [];

        for (var j = 0; j < item.tel.length; j++) {
          var aTel = item.tel[j];
          // Filtering out empty values
          if (aTel.value && aTel.value.trim()) {
            aTel.type = [DEFAULT_TEL_TYPE];
            telItems.push(aTel);
          }
        }
        item.tel = telItems;
      }

      item.category = ['sim'];
      item.url = generateIccContactUrl(item.id);

      // Item is presumably a mozContact but for some reason if
      // we don't create a new mozContact sometimes the save call fails
      var contact = item;

      var cbs = {
        onmatch: function(results) {

          var mergeCbs = {
            success: function() {
              numDupsMerged++;
              continueCb();
            },
            error: function(e) {
              window.console.error('Error while merging: ', e.name);
              continueCb();
            }
          };

          contacts.adaptAndMerge(this, results, mergeCbs);
        }.bind(contact),
        onmismatch: function() {
          saveContact(this);
        }.bind(contact)
      };

      contacts.Matcher.match(item, 'passive', cbs);
    }
  } // importSlice


  function saveContact(contact) {
    var req = window.navigator.mozContacts.save(new mozContact(contact));
      req.onsuccess = function saveSuccess() {
        continueCb();
      };
      req.onerror = function saveError() {
        console.error('SIM Import: Error importing ', contact.id,
                      req.error.name);
        continueCb();
      };
  }
}
