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
    return;
  }
  var pointer = 0;
  var CHUNK_SIZE = 5;
  var numResponses = 0;
  var self = this;
  var _ = navigator.mozL10n.get;
  var mustFinish = false;
  var loadedMatch = false;
  var icc = targetIcc;
  var iccId = icc.iccInfo && icc.iccInfo.iccid;

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

  this.start = function() {
    if (mustFinish) {
      notifyFinish();
      return;
    }

    LazyLoader.load([
      '/shared/js/simple_phone_matcher.js',
      '/contacts/js/contacts_matcher.js',
      '/contacts/js/contacts_merger.js',
      '/contacts/js/utilities/image_thumbnail.js',
      '/contacts/js/merger_adapter.js'
    ], function loaded() {
      loadedMatch = true;
      document.dispatchEvent(new CustomEvent('matchLoaded'));
    });

    var iccManager = navigator.mozIccManager;
    var request;

    // request contacts with readContacts() -- valid types are:
    //   'adn': Abbreviated Dialing Numbers
    //   'fdn': Fixed Dialing Numbers
    if (icc && icc.readContacts) {
      request = icc.readContacts('adn');
    }
    else if (navigator.mozContacts) {
      // Just to enable import on builds different than M-C
      // In the longer term this line of code would disappear
      request = navigator.mozContacts.getSimContacts('ADN');
    }
    else {
      throw new Error('Not able to obtain a SIM import function from platform');
    }

    request.onsuccess = function onsuccess() {
      if (mustFinish) {
        notifyFinish();
        return;
      }

      self.items = request.result; // array of mozContact elements
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
    };

    request.onerror = function error() {
      if (typeof self.onerror === 'function') {
        self.onerror(request.error);
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
      item.givenName = item.name;

      if (Array.isArray(item.tel)) {
        var telItems = [];

        for (var j = 0; j < item.tel.length; j++) {
          var aTel = item.tel[j];
          // Filtering out empty values
          if (aTel.value && aTel.value.trim()) {
            aTel.type = ['mobile'];
            telItems.push(aTel);
          }
        }
        item.tel = telItems;
      }

      item.category = ['sim'];
      item.url = generateIccContactUrl(item.id);
      delete item.id;

      // Item is presumably a mozContact but for some reason if
      // we don't create a new mozContact sometimes the save call fails
      var contact = utils.misc.toMozContact(item);

      var cbs = {
        onmatch: function(results) {
          var mergeCbs = {
            success: continueCb,
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
    var req = window.navigator.mozContacts.save(contact);
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
