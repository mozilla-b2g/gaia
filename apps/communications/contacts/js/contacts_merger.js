'use strict';

var contacts = window.contacts || {};

contacts.Merger = (function() {
  var DEFAULT_ADR_TYPE = 'home';
  var DEFAULT_TEL_TYPE = 'another';
  var DEFAULT_EMAIL_TYPE = 'personal';

  // Performs the merge passing the master contact and matching contacts
  // The master contact will be the one that will contain all the merged info
  // The matchingContacts are the contacts which information will merged with
  // the master. It is an Array in which the elements should be ordered
  // by priority i.e. the data from the first elements might take precedence
  // over the data of the last elements according to the merging rules.
  //
  // Each element in the array is an objects with the following keys:
  //   * matchingContact: the Contact object matching one or more targets.
  //   * matchings: optional, an object whose entries are arrays of
  //     field-matching objects indexed by the field name.
  //
  // Each field-matching object has two fields:
  //   * target: the value that field matched with.
  //   * matchedValue: the value from the matchingContact field matching the
  //     target.
  //
  // Here is an example:
  // {
  //   matchingContact: { ... },
  //   matchings: {
  //     'tel': [{
  //       target: '600000000',
  //       matchedValue: '+34600000000'
  //     }]
  //   }
  // }
  //
  // The `matchings` field can be not present if the matching contact comes
  // from an external source not related with the matching algorithm.
  function doMerge(pmasterContact, pmatchingContacts, callbacks) {
    window.setTimeout(function contactsMerge() {
      mergeAll(pmasterContact, pmatchingContacts, callbacks);
    }, 0);
  }

  function mergeAll(masterContact, matchingContacts, callbacks) {
    var emailsHash;
    var orgsHash;
    var categoriesHash;
    var telsHash;
    var mergedContact = {};

    mergedContact.givenName = masterContact.givenName || [''];
    mergedContact.familyName = masterContact.familyName || [''];

    var recGivenName = mergedContact.givenName;
    var recFamilyName = mergedContact.familyName;

    var maxLengthGivenName = (recGivenName[0] && recGivenName[0].length) || 0;
    var maxLengthFamilyName = (recFamilyName[0] &&
                                recFamilyName[0].length) || 0;

    mergedContact.photo = masterContact.photo || [];
    mergedContact.bday = masterContact.bday;

    mergedContact.adr = masterContact.adr || [];

    telsHash = {};
    mergedContact.tel = [];
    if (Array.isArray(masterContact.tel)) {
      masterContact.tel.forEach(function(aTel) {
        if (!telsHash[aTel.value]) {
          aTel.type = (Array.isArray(aTel.type) ? aTel.type : [aTel.type]);
          aTel.type[0] = aTel.type[0] || DEFAULT_TEL_TYPE;
          mergedContact.tel.push(aTel);
          telsHash[aTel.value] = true;
        }
      });
    }

    mergedContact.email = [];
    emailsHash = {};
    populateEmails(masterContact.email, emailsHash, mergedContact.email);

    mergedContact.org = masterContact.org || [];

    mergedContact.category = [];
    categoriesHash = {};
    populateNoDuplicates(masterContact.category, categoriesHash,
                         mergedContact.category);

    mergedContact.url = masterContact.url || [];
    mergedContact.note = masterContact.note || [];

    matchingContacts.forEach(function(aResult) {
      var theMatchingContact = aResult.matchingContact;

      var givenName = theMatchingContact.givenName;
      if (isDefined(givenName) && givenName[0].length > maxLengthGivenName) {
        maxLengthGivenName = givenName[0].length;
        recGivenName.pop();
        recGivenName.push(givenName[0]);
      }

      var familyName = theMatchingContact.familyName;
      if (isDefined(familyName) && familyName[0].length > maxLengthFamilyName) {
        maxLengthFamilyName = familyName[0].length;
        recFamilyName.pop();
        recFamilyName.push(familyName[0]);
      }

      if (!mergedContact.bday && theMatchingContact.bday) {
        mergedContact.bday = theMatchingContact.bday;
      }

      if (isDefined(theMatchingContact.org) && mergedContact.org.length === 0) {
        mergedContact.org = theMatchingContact.org;
      }
      if (isDefined(theMatchingContact.category)) {
        populateNoDuplicates(theMatchingContact.category, categoriesHash,
                              mergedContact.category);
      }

      populateEmails(theMatchingContact.email, emailsHash, mergedContact.email);

      if (Array.isArray(theMatchingContact.tel)) {
        var theMatchings = aResult.matchings || {};
        var telMatchings = theMatchings['tel'];
        theMatchingContact.tel.forEach(function(aTel) {
          var theValue = aTel.value;
          var target = theValue, matchedValue = '';
          if (telMatchings) {
            var matchedFrom = telMatchings.filter(function(x) {
              return (x.target === theValue || x.matchedValue === theValue);
            });
            if (matchedFrom[0]) {
              target = matchedFrom[0].target;
              matchedValue = matchedFrom[0].matchedValue;
            }
          }

          if (!telsHash[aTel.value] && !telsHash[target]) {
            theValue = target.length > matchedValue.length ?
                              target : matchedValue;
            mergedContact.tel.push({
              type: aTel.type || [DEFAULT_TEL_TYPE],
              value: theValue,
              carrier: aTel.carrier,
              pref: aTel.pref
            });
            telsHash[target] = true;
            telsHash[matchedValue] = true;
          }
        });
      }

      if (!isDefined(mergedContact.photo) &&
                                          isDefined(theMatchingContact.photo)) {
        mergedContact.photo.push(theMatchingContact.photo[0]);
      }

      populateField(theMatchingContact.adr, mergedContact.adr,
                                                              DEFAULT_ADR_TYPE);

      populateField(theMatchingContact.url, mergedContact.url);
      populateField(theMatchingContact.note, mergedContact.note);

    }); // matchingResults


    mergedContact.name = [(Array.isArray(recGivenName) && recGivenName[0] ?
                           recGivenName[0] : '') + ' ' +
                (Array.isArray(recFamilyName) && recFamilyName[0] ?
                            recFamilyName[0] : '')];

    var fields = ['familyName', 'givenName', 'name', 'org', 'email', 'tel',
                  'bday', 'adr', 'category', 'url', 'note', 'photo'];

    fields.forEach(function(aField) {
      masterContact[aField] = mergedContact[aField];
    });

    // Updating the master contact
    var req = navigator.mozContacts.save(masterContact);

    req.onsuccess = function() {
      // Now for all the matchingContacts they have to be removed
      matchingContacts.forEach(function(aMatchingContact) {
        // Only remove those contacts which are already in the DB
        if (aMatchingContact.matchingContact.id) {
          navigator.mozContacts.remove(aMatchingContact.matchingContact);
        }
      });

      typeof callbacks.success === 'function' &&
                                              callbacks.success(mergedContact);
    };

    req.onerror = function() {
      window.console.error('Error while saving merged Contact: ',
                           req.error.name);
      typeof callbacks.error === 'function' && callbacks.error(req.error);
    };
  }

  function isDefined(field) {
    return (Array.isArray(field) && field[0] &&
            ((typeof field[0] === 'string' && field[0].trim().length > 0) ||
             typeof field[0] === 'object'));
  }


  function populateEmails(sourceEmails, hash, out) {
    if (Array.isArray(sourceEmails)) {
      sourceEmails.forEach(function(aEmail) {
        var type = Array.isArray(aEmail.type) ? aEmail.type : [aEmail.type];
        aEmail.type[0] = aEmail.type[0] || DEFAULT_EMAIL_TYPE;
        if (!hash[aEmail.value]) {
          out.push(aEmail);
          hash[aEmail.value] = true;
        }
      });
    }
  }


  function populateNoDuplicates(source, hash, out) {
    if (Array.isArray(source)) {
      source.forEach(function(aCat) {
        if (!hash[aCat]) {
          out.push(aCat);
          hash[aCat] = true;
        }
      });
    }
  }

  function populateField(source, destination, defaultType) {
    if (Array.isArray(source)) {
      source.forEach(function(as) {
        if (defaultType && (!as.type || !as.type[0])) {
          as.type = [defaultType];
        }
        destination.push(as);
      });
    }
  }

  return {
    merge: doMerge
  };

})();
