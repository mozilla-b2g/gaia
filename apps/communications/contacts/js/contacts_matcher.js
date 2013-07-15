var contacts = window.contacts || {};

contacts.Matcher = (function() {
  var selfContactId;
  var incomingContact;

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
          if (selfContactId === aMatching.id) {
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
        });

        if (Object.keys(finalMatchings).length > 0) {
          notifyMatch(self, finalMatchings);
        }
        else {
          notifyMismatch(self);
        }
      };

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
        values.push(aField.value);
      });
    }

    if (values.length > 0) {
      var matcher = new MultipleMatcher(values, {
        filterBy: [field],
        filterOp: filterOper
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
      doMatchSilent(aContact, callbacks);
    }
    else if (mode === 'active') {
      doMatchActive(aContact, callbacks);
    }
  }

  // Implements the active mode 'matching'
  function doMatchActive(aContact, callbacks) {
    incomingContact = aContact;
    selfContactId = aContact.id;

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
  function doMatchSilent(aContact, callbacks) {
    incomingContact = aContact;
    selfContactId = aContact.id;

    if (!hasName(aContact)) {
      notifyMismatch(callbacks);
      return;
    }

    var matchingsFound = {};

    var blankRegExp = /\s+/g;

    var localCbs = {
      onmatch: function(results) {
        // Results will contain contacts that match by tel or email
        // Now a binary search is performed over givenName and lastName
        // Normalizing the strings
        var names = [];
        Object.keys(results).forEach(function(aResultId) {
          var mContact = results[aResultId].matchingContact;

          if (!hasName(mContact)) {
            return;
          }

          // As the number of candidates here will be short a normal search
          // will be conducted

          var targetFN = Normalizer.toAscii(
                          incomingContact.familyName[0].trim().toLowerCase()).
                          replace(blankRegExp, '');
          var targetGN = Normalizer.toAscii(
                          incomingContact.givenName[0].trim().toLowerCase()).
                          replace(blankRegExp, '');

          names.push({
            contact: mContact,
            familyName: Normalizer.toAscii(
                                  mContact.familyName[0].trim().toLowerCase()).
                          replace(blankRegExp, ''),
            givenName: Normalizer.toAscii(
                                    mContact.givenName[0].trim().toLowerCase()).
                          replace(blankRegExp, '')
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

        reconcileResults(matchingsFound, results, callbacks);
      },

      onmismatch: function() {
        notifyMismatch(callbacks);
      }
    };

    // Matching by email and phone number, then match by names
    doMatchActive(aContact, localCbs);
  }

  function isEmpty(collection) {
    return ((!Array.isArray(collection) || !collection[0]) || (collection[0] &&
                          collection[0].value && !collection[0].value.trim()));
  }

  function hasName(aContact) {
    return (Array.isArray(aContact.familyName) &&
      Array.isArray(aContact.givenName) && aContact.familyName[0] &&
      aContact.familyName[0].trim() && aContact.givenName[0] &&
      aContact.givenName[0].trim());
  }

  function reconcileResults(nameMatches, phoneMailMatches, callbacks) {
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
