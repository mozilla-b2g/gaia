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
  // over the data of the last elements according to the merging rules
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
      var aDeviceContact = aResult.matchingContact;

      var givenName = aDeviceContact.givenName;
      if (isDefined(givenName) && givenName[0].length > maxLengthGivenName) {
        maxLengthGivenName = givenName[0].length;
        recGivenName.pop();
        recGivenName.push(givenName[0]);
      }

      var familyName = aDeviceContact.familyName;
      if (isDefined(familyName) && familyName[0].length > maxLengthFamilyName) {
        maxLengthFamilyName = familyName[0].length;
        recFamilyName.pop();
        recFamilyName.push(familyName[0]);
      }

      if (!mergedContact.bday && aDeviceContact.bday) {
        mergedContact.bday = aDeviceContact.bday;
      }

      if (isDefined(aDeviceContact.org) && mergedContact.org.length === 0) {
        mergedContact.org = aDeviceContact.org;
      }
      if (isDefined(aDeviceContact.category)) {
        populateNoDuplicates(aDeviceContact.category, categoriesHash,
                              mergedContact.category);
      }

      populateEmails(aDeviceContact.email, emailsHash, mergedContact.email);

      if (Array.isArray(aDeviceContact.tel)) {
        aResult.matchedValues = aResult.matchedValues || [];
        aDeviceContact.tel.forEach(function(aTel) {
          var matchedValIdx = aResult.matchedValues.indexOf(aTel.value);
          var matchedValue = aTel.value;
          if (matchedValIdx !== -1) {
            matchedValue = aResult.matchedValues[matchedValIdx];
          }
          if (!telsHash[aTel.value] && !telsHash[aResult.target]) {
            var theValue = aResult.target.length > matchedValue.length ?
                              aResult.target : matchedValue;
            mergedContact.tel.push({
              type: aTel.type || [DEFAULT_TEL_TYPE],
              value: theValue,
              carrier: aTel.carrier,
              pref: aTel.pref
            });
            telsHash[aResult.target] = true;
            telsHash[matchedValue] = true;
          }
        });
      }

      if (!isDefined(mergedContact.photo) && isDefined(aDeviceContact.photo)) {
        mergedContact.photo.push(aDeviceContact.photo[0]);
      }

      populateField(aDeviceContact.adr, mergedContact.adr, DEFAULT_ADR_TYPE);

      populateField(aDeviceContact.url, mergedContact.url);
      populateField(aDeviceContact.note, mergedContact.note);

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
