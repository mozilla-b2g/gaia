'use strict';

var contacts = window.contacts || {};

contacts.Matcher = (function() {
  var blankRegExp = /\s+/g;

  var FB_CATEGORY = 'facebook';
  var FB_LINKED = 'fb_linked';

  // Multiple matcher Object. It tries to find a set of Contacts that match at
  // least one of the targets passed as parameters
  // ptargets: They are the targets (telephone numbers, emails) we want to find
  // in the Contacts DB
  // mmatchingOptions: are the matching options to be passed to the mozContacts
  // API. Particularly filterBy and filterOp
  // MultipleMatcher.onmatch is called when there is at least one matching
  // MultipleMatcher.onmismatch is called when there are no matches
  function MultipleMatcher(ptargets, pmatchingOptions) {
    var next = 0;
    var self = this;
    var targets = ptargets;
    var matchingOptions = pmatchingOptions;
    var finalMatchings = {};

    function doMatchBy(target, callbacks) {
      var options = {
        filterValue: target,
        filterBy: matchingOptions.filterBy,
        filterOp: matchingOptions.filterOp
      };

      var req = navigator.mozContacts.find(options);

      req.onsuccess = function() {
        var matchings = req.result.filter(function(aResult) {
          return filterFacebook(aResult, matchingOptions.linkParams);
        });

        var filterBy = options.filterBy;

        var sanitizedTarget = SimplePhoneMatcher.sanitizedNumber(target);
        var targetVariants = SimplePhoneMatcher.generateVariants(target);

        matchings.forEach(function(aMatching) {
          if (matchingOptions.selfContactId === aMatching.id) {
            return;
          }

          var field = options.filterBy[0];
          var values = aMatching[field];

          values.forEach(function(aValue) {
            var value = aValue.value;
            var sanitizedValue = SimplePhoneMatcher.sanitizedNumber(value);
            var valueMatched = false;

            if (targetVariants.length > 1) {
              if (targetVariants.indexOf(sanitizedValue) !== -1) {
                valueMatched = true;
              }
            } else if (SimplePhoneMatcher.generateVariants(sanitizedValue).
                       indexOf(sanitizedTarget) !== -1) {
                valueMatched = true;
              }

            if (valueMatched) {
              var matchings, matchingObj;
              if (!finalMatchings[aMatching.id]) {
                matchingObj = {
                  matchings: {},
                  matchingContact: aMatching
                };
                finalMatchings[aMatching.id] = matchingObj;
                matchingObj.matchings[filterBy[0]] = [];
              }
              else {
                matchingObj = finalMatchings[aMatching.id];
              }
              matchings = matchingObj.matchings[filterBy[0]];

              // Avoinding to report multiple matchings due to variants
              var sameValueMatchings = matchings.filter(function(matching) {
                return (matching.matchedValue === value);
              });
              if (sameValueMatchings.length === 0) {
                matchings.push({
                  'target': target,
                  'matchedValue': value
                });
              }
            }
          });
        });  // matchings.forEach

        carryOn();
      }; // onsuccess

      req.onerror = function(e) {
        window.console.error('Error while trying to do the matching',
                             e.target.error.name);
        notifyMismatch(self);
      };
    }

    function carryOn() {
      next++;
      if (next < targets.length) {
        doMatchBy(targets[next], callbacks);
      }
      else if (Object.keys(finalMatchings).length > 0) {
        notifyMatch(self, finalMatchings);
      }
      else {
        notifyMismatch(self);
      }
    }

    function matched(contacts) {
      carryOn();
    }

    var callbacks = {
      onmatch: matched,
      onmismatch: carryOn
    };

    this.start = function() {
      doMatchBy(targets[0], callbacks);
    };
  }

  function notifyMatch(obj, matchings) {
    typeof obj.onmatch === 'function' && obj.onmatch(matchings);
  }

  function notifyMismatch(obj) {
    typeof obj.onmismatch === 'function' && obj.onmismatch();
  }

  // Match a Contact by the field and filter specified as parameters
  // Callbacks is an object that declares onmatch and onmismatch callbacks
  function matchBy(aContact, field, filterOper, callbacks, poptions) {
    var options = poptions || {};
    var values = [];

    if (Array.isArray(aContact[field])) {
      aContact[field].forEach(function(aField) {
        if (field === 'tel') {
          // Bug 924378 Contacts API does not properly match phone numbers
          // and their variants
          var variants = SimplePhoneMatcher.generateVariants(aField.value);
          variants.forEach(function(aVariant) {
            values.push(aVariant);
          });
        }
        else if (typeof aField.value === 'string') {
          values.push(aField.value.trim());
        }
      });
    }

    if (values.length > 0) {
      var matcher = new MultipleMatcher(values, {
        filterBy: [field],
        filterOp: filterOper,
        selfContactId: aContact.id,
        linkParams: options
      });
      matcher.onmatch = callbacks.onmatch;

      matcher.onmismatch = callbacks.onmismatch;

      matcher.start();
    }
    else {
      notifyMismatch(callbacks);
    }
  }

  function matchByTel(aContact, callbacks, options) {
    matchBy(aContact, 'tel', 'match', callbacks, options);
  }

  function matchByEmail(aContact, callbacks, options) {
    matchBy(aContact, 'email', 'startsWith', callbacks, options);
  }

  // Performs a matching for an incoming contact 'aContact' and the mode
  // ['active', passive'] specified as parameter. Callbacks is an object
  // with the onmatch and onmismatch functions that will be called after
  // the matching process has finished
  function doMatch(aContact, mode, callbacks) {
    if (mode === 'passive') {
      doMatchPassive(aContact, callbacks);
    }
    else if (mode === 'active') {
      doMatchActive(aContact, callbacks);
    }
  }

  // Implements the active mode 'matching'
  function doMatchTelAndEmail(aContact, callbacks, options) {
    var localCbs = {
      onmatch: function(telMatches) {
        var matchCbs = {
          onmatch: function(mailMatches) {
            // Have a unique set of matches
            var allMatches = telMatches;
            Object.keys(mailMatches).forEach(function(aMatch) {
              if (!allMatches[aMatch]) {
                allMatches[aMatch] = mailMatches[aMatch];
              }
              else {
                allMatches[aMatch].matchings['email'] =
                                        mailMatches[aMatch].matchings['email'];
              }
            });
            notifyMatch(callbacks, allMatches);
          },
          onmismatch: function() {
            notifyMatch(callbacks, telMatches);
          }
        };
        matchByEmail(aContact, matchCbs, options);
      },
      onmismatch: function() {
        matchByEmail(aContact, callbacks, options);
      }
    };
    matchByTel(aContact, localCbs, options);
  }

  // Implements the silent mode matching
  function doMatchPassive(aContact, callbacks) {
    if (!hasName(aContact)) {
      notifyMismatch(callbacks);
      return;
    }

    var matchingsFound = {};

    var localCbs = {
      onmatch: function(results) {
        // Results will contain contacts that match by tel or email
        // Normalizing the strings
        var names = [];
        Object.keys(results).forEach(function(aResultId) {
          var mContact = results[aResultId].matchingContact;

          if (!hasName(mContact)) {
            return;
          }

          // As the number of candidates here will be short a normal search
          // will be conducted
          var targetFN = null;
          if (!isEmptyStr(aContact.familyName)) {
            targetFN = Normalizer.toAscii(
                          aContact.familyName[0].trim().toLowerCase()).
                          replace(blankRegExp, '');
          }
          var targetGN = null;
          if (!isEmptyStr(aContact.givenName)) {
            targetGN = Normalizer.toAscii(
                          aContact.givenName[0].trim().toLowerCase()).
                          replace(blankRegExp, '');
          }
          // To support seamless matching of SIM contacts
          var targetName = (targetGN || '') + (targetFN || '');

          var mFamilyName = null;
          var mGivenName = null;

          if (!isEmptyStr(mContact.familyName)) {
            mFamilyName = Normalizer.toAscii(
                                  mContact.familyName[0].trim().toLowerCase()).
                          replace(blankRegExp, '');
          }

          if (!isEmptyStr(mContact.givenName)) {
            mGivenName = Normalizer.toAscii(
                                    mContact.givenName[0].trim().toLowerCase()).
                          replace(blankRegExp, '');
          }
          // To support seamless matching of SIM contacts
          var mName = (mGivenName || '') + (mFamilyName || '');

          names.push({
            contact: mContact,
            familyName: mFamilyName,
            givenName: mGivenName,
            name: mName
          });

          var matchingList = names.filter(function(obj) {
            return ((obj.familyName === targetFN &&
                     obj.givenName === targetGN) ||
                    (obj.name && obj.name === targetName) && (
                    !Array.isArray(obj.contact.category) ||
                    obj.contact.category.indexOf(FB_CATEGORY) === -1));
          });

          matchingList.forEach(function(aMatching) {
            var contact = aMatching.contact;
            matchingsFound[contact.id] = {
              matchingContact: contact
            };
          });
        });

        reconcileResults(aContact, matchingsFound, results, callbacks);
      },

      onmismatch: function() {
        notifyMismatch(callbacks);
      }
    };

    // Matching by email and phone number, then match by names
    doMatchTelAndEmail(aContact, localCbs);
  }

  function doMatchActive(aContact, callbacks) {
    var options = {
      linkedMatched: {},
      linkedTo: getLinkedTo(aContact)
    };

    var localCbs = {
      onmatch: function(results) {
        var cbsName = {
          onmatch: function(nameResults) {
            Object.keys(nameResults).forEach(function(aId) {
              if (!results[aId]) {
                results[aId] = nameResults[aId];
              }
              else {
                results[aId].matchings['name']  =
                                          nameResults[aId].matchings['name'];
              }
            });

            notifyMatch(callbacks, results);
          },
          onmismatch: function() {
            notifyMatch(callbacks, results);
          }
        };

        matchByName(aContact, cbsName, options);
      },
      onmismatch: function() {
        matchByName(aContact, callbacks, options);
      }
    };

    // Matching by email and phone number, then match by names
    doMatchTelAndEmail(aContact, localCbs, options);
  }

  function notifyFindNameReady() {
    document.dispatchEvent(new CustomEvent('by_name_ready'));
  }

  // Used for the active mode. Performs matching by familyName and givenName
  function matchByName(aContact, callbacks, options) {
    // First we try to find by familyName
    // Afterwards we search by givenName
    var isSimContact = (Array.isArray(aContact.category) &&
                        aContact.category.indexOf('sim') !== -1);

    if ((isEmptyStr(aContact.familyName) || isEmptyStr(aContact.givenName)) &&
       !isSimContact) {
      notifyMismatch(callbacks);
      return;
    }

    var finalResult = {};

    var resultsByName = [];
    if (!isEmptyStr(aContact.name)) {
      var targetName = aContact.name[0].trim();
      // Filter by familyName using startsWith. Gecko 'startsWith' operation
      // acts as 'equal' but does not match case.
      var reqName = navigator.mozContacts.find({
        filterValue: targetName,
        filterBy: ['name'],
        filterOp: 'startsWith'
      });

      reqName.onsuccess = function() {
        resultsByName = reqName.result.filter(function(aResult) {
          return filterFacebook(aResult, options);
        });
        notifyFindNameReady();
      };

      reqName.onerror = function(e) {
        window.console.warn('Error while trying to find by name: ',
                                e.target.error.name);
        notifyFindNameReady();
      };
    }
    else {
      notifyFindNameReady();
    }

    if (isEmptyStr(aContact.familyName)) {
      endOfMatchByName(finalResult, targetName, resultsByName, callbacks);
    }
    else {
      var targetFamilyName = aContact.familyName[0].trim();
      // Filter by familyName using startsWith. Gecko 'startsWith' operation
      // acts as 'equal' but does not match case.
      var reqFamilyName = navigator.mozContacts.find({
        filterValue: targetFamilyName,
        filterBy: ['familyName'],
        filterOp: 'startsWith'
      });

      reqFamilyName.onsuccess = function() {
        var results = reqFamilyName.result;

        var givenNames = [];
        var targetGN = null;

        if (!isEmptyStr(aContact.givenName)) {
          targetGN = Normalizer.toAscii(
                            aContact.givenName[0].trim().toLowerCase()).
                            replace(blankRegExp, '');
        }

        results.forEach(function(mContact) {
          if (mContact.id === aContact.id || isEmptyStr(mContact.givenName)) {
            return;
          }
          givenNames.push({
            contact: mContact,
            givenName: Normalizer.toAscii(
                         mContact.givenName[0].trim().toLowerCase()).
                          replace(blankRegExp, '')
          });
        });

        var finalMatchings = givenNames.filter(function(obj) {
          var gn = obj.givenName;
          return ((gn === targetGN || targetGN.startsWith(gn) ||
                  gn.startsWith(targetGN)) &&
                  filterFacebook(obj.contact, options));
        });

        finalMatchings.forEach(function(aMatching) {
          finalResult[aMatching.contact.id] = {
            matchings: {
              'name': [{
                target: targetFamilyName,
                matchedValue: Array.isArray(aMatching.contact.name) ?
                              aMatching.contact.name[0] :
                              getCompleteName(aMatching.contact)
              }]
            },
            matchingContact: aMatching.contact
          };
        });

        if (resultsByName) {
          endOfMatchByName(finalResult, targetName, resultsByName, callbacks);
        }
        else {
          document.addEventListener('by_name_ready', function nameReady() {
            document.removeEventListener('by_name_ready', nameReady);
            endOfMatchByName(finalResult, targetName, resultsByName, callbacks);
          });
        }
      };

      reqFamilyName.onerror = function(e) {
        window.console.error('Error while trying to find by familyName: ',
                             e.target.error.name);
        notifyMismatch(callbacks);
      };
    }
  }

  function getLinkedTo(contact) {
    var out = null;

    if (Array.isArray(contact.category)) {
      var idx = contact.category.indexOf(FB_LINKED);
      if (idx !== -1) {
        out = contact.category[idx + 1];
      }
    }
    return out;
  }

  function isFbLinked(contact) {
    return (Array.isArray(contact.category) &&
                        contact.category.indexOf(FB_LINKED) !== -1);
  }

  function isFbContact(contact) {
    return (Array.isArray(contact.category) &&
                        contact.category.indexOf(FB_CATEGORY) !== -1);
  }

  function filterFacebook(contact, linkParams) {
    var out = false;

    if (!isFbContact(contact)) {
      out = true;
    }
    else if (isFbLinked(contact)) {
      var linkedTo = getLinkedTo(contact);
      var targetUid = linkParams.linkedTo || '';
      var linkedMatched = linkParams.linkedMatched || {};

      if (targetUid === linkedTo) {
        out = true;
      }
      // It is only allowed to match one linked contact or various but all of
      // them linked to the same FB friend
      else if ((Object.keys(linkedMatched).length === 0 ||
               linkedMatched[linkedTo]) && !targetUid) {
        linkedMatched[linkedTo] = linkedTo;
        out = true;
      }
    }

    return out;
  }

  function endOfMatchByName(finalResult, targetName, resultsByName, callbacks) {
    resultsByName.forEach(function(aResult) {
      var matchingObj = {
        matchings: {
          'name': [{
            target: targetName,
            matchedValue: Array.isArray(aResult.name) ?
                          aResult.name[0] :
                          getCompleteName(aResult)
          }]
        },
        matchingContact: aResult
      };

      if (!finalResult[aResult.id]) {
        finalResult[aResult.id] = matchingObj;
      }
      else {
        finalResult[aResult.id].matchings['name'] =
          matchingObj.matchings['name'];
      }
    });

    if (Object.keys(finalResult).length > 0) {
      notifyMatch(callbacks, finalResult);
    }
    else {
      notifyMismatch(callbacks);
    }
  }

  function getCompleteName(contact) {
    var givenName = Array.isArray(contact.givenName) ?
                    contact.givenName[0] : '';

    var familyName = Array.isArray(contact.familyName) ?
                    contact.familyName[0] : '';

    var completeName = givenName && familyName ?
                       givenName + ' ' + familyName :
                       givenName || familyName;

    return completeName;
  }

  function isEmpty(collection) {
    return ((!Array.isArray(collection) || !collection[0]) || (collection[0] &&
                          collection[0].value && !collection[0].value.trim()));
  }

  function isEmptyStr(collection) {
    return (!Array.isArray(collection) ||
            !(typeof collection[0] === 'string') || !(collection[0].trim()));
  }

  function hasName(aContact) {
    return (!isEmptyStr(aContact.givenName) ||
            !isEmptyStr(aContact.familyName));
  }

  function reconcileResults(incomingContact, nameMatches, phoneMailMatches,
                            callbacks) {
    var finalMatchings = {};

    // Name matches drive all the process
    Object.keys(nameMatches).forEach(function(aNameMatching) {
      var matchingContact = nameMatches[aNameMatching].matchingContact;

      var isPhoneMatching = Array.isArray(phoneMailMatches[aNameMatching].
                                          matchings['tel']);
      var isMailMatching = Array.isArray(phoneMailMatches[aNameMatching].
                                          matchings['email']);

      // Three cases under which a matching is considered
      if (isPhoneMatching && isMailMatching) {
        finalMatchings[aNameMatching] = phoneMailMatches[aNameMatching];
      }
      else if (isPhoneMatching && (isEmpty(incomingContact.email) ||
              isEmpty(matchingContact.email))) {
        finalMatchings[aNameMatching] = phoneMailMatches[aNameMatching];
      }
      else if (isMailMatching && (isEmpty(incomingContact.tel) ||
                                  isEmpty(matchingContact.tel))) {
        finalMatchings[aNameMatching] = phoneMailMatches[aNameMatching];
      }
    });

    if (Object.keys(finalMatchings).length > 0) {
      notifyMatch(callbacks, finalMatchings);
    }
    else {
      notifyMismatch(callbacks);
    }
  }

  return {
    match: doMatch
  };
})();
