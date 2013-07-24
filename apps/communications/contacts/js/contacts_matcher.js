'use strict';

var contacts = window.contacts || {};

contacts.Matcher = (function() {
  var blankRegExp = /\s+/g;

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
        var matchings = req.result;

        var filterBy = options.filterBy;

        matchings.forEach(function(aMatching) {
          if (matchingOptions.selfContactId === aMatching.id) {
            return;
          }

          var values = aMatching[options.filterBy[0]];
          var matchedValue;

          values.forEach(function(aValue) {
            var type = aValue.type;
            var value = aValue.value;

            if (value === target || value.indexOf(target) !== -1 ||
               target.indexOf(value) !== -1) {
              matchedValue = value;
            }

            finalMatchings[aMatching.id] = {
              target: target,
              fields: filterBy,
              matchedValues: [matchedValue],
              matchingContact: aMatching
            };
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
  function matchBy(aContact, field, filterOper, callbacks) {
    var values = [];

    if (Array.isArray(aContact[field])) {
      aContact[field].forEach(function(aField) {
        if (typeof aField.value === 'string') {
          values.push(aField.value.trim());
        }
      });
    }

    if (values.length > 0) {
      var matcher = new MultipleMatcher(values, {
        filterBy: [field],
        filterOp: filterOper,
        selfContactId: aContact.id
      });
      matcher.onmatch = callbacks.onmatch;

      matcher.onmismatch = callbacks.onmismatch;

      matcher.start();
    }
    else {
      notifyMismatch(callbacks);
    }
  }

  function matchByTel(aContact, callbacks) {
    matchBy(aContact, 'tel', 'match', callbacks);
  }

  function matchByEmail(aContact, callbacks) {
    matchBy(aContact, 'email', 'equals', callbacks);
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
  function doMatchTelAndEmail(aContact, callbacks) {
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
                allMatches[aMatch].fields.push('email');
                allMatches[aMatch].matchedValues.push(
                                        mailMatches[aMatch].matchedValues[0]);
              }
            });
            notifyMatch(callbacks, allMatches);
          },
          onmismatch: function() {
            notifyMatch(callbacks, telMatches);
          }
        };
        matchByEmail(aContact, matchCbs);
      },
      onmismatch: function() {
        matchByEmail(aContact, callbacks);
      }
    };
    matchByTel(aContact, localCbs);
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

          names.push({
            contact: mContact,
            familyName: mFamilyName,
            givenName: mGivenName
          });

          var matchingList = names.filter(function(x) {
            return (x.familyName === targetFN && x.givenName === targetGN);
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
    var localCbs = {
      onmatch: function(results) {
        var cbsName = {
          onmatch: function(nameResults) {
            Object.keys(nameResults).forEach(function(aId) {
              if (!results[aId]) {
                results[aId] = nameResults[aId];
              }
            });

            notifyMatch(callbacks, results);
          },
          onmismatch: function() {
            notifyMatch(callbacks, results);
          }
        };

        matchByName(aContact, cbsName);
      },
      onmismatch: function() {
        matchByName(aContact, callbacks);
      }
    };

    // Matching by email and phone number, then match by names
    doMatchTelAndEmail(aContact, localCbs);
  }

  // Used for the active mode. Performs matching by familyName and givenName
  function matchByName(aContact, callbacks) {
    // First we try to find by familyName
    // Afterwards we search by givenName
    if (isEmptyStr(aContact.familyName) || isEmptyStr(aContact.givenName)) {
      notifyMismatch(callbacks);
      return;
    }

    var filterValue = aContact.familyName[0].trim();
    var filterBy = filterBy = ['familyName'];

    var options = {
      filterValue: filterValue,
      filterBy: filterBy,
      filterOp: 'equals'
    };

    var req = navigator.mozContacts.find(options);

    req.onsuccess = function() {
      var results = req.result;

      var givenNames = [];
      var targetGN = Normalizer.toAscii(
                          aContact.givenName[0].trim().toLowerCase()).
                          replace(blankRegExp, '');
      if (results.length > 0) {
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

        var finalMatchings = givenNames.filter(function(x) {
          var gn = x.givenName;
          return (gn === targetGN || targetGN.startsWith(gn) ||
                  gn.startsWith(targetGN));
        });

        if (finalMatchings.length === 0) {
          notifyMismatch(callbacks);
          return;
        }

        var result = {};
        finalMatchings.forEach(function(aMatching) {
          result[aMatching.contact.id] = {
            matchingContact: aMatching.contact
          };
        });

        notifyMatch(callbacks, result);
      }
      else {
        notifyMismatch(callbacks);
      }
    };

    req.onerror = function(e) {
      window.console.error('Error while trying to find by familyName: ',
                           e.target.error.name);
      notifyMismatch(callbacks);
    };
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

      var isPhoneMatching = phoneMailMatches[aNameMatching].
                                          fields.indexOf('tel') !== -1;
      var isMailMatching = phoneMailMatches[aNameMatching].
                                          fields.indexOf('email') !== -1;

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
