/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global fb,
          Set,
          Settings,
          Utils
*/

(function(exports) {
  'use strict';

  var unknownNumbers = new Set();

  var filterFns = {
    contains: function(a, b) {
      a = a.toLowerCase();
      b = b.toLowerCase();
      return a.contains(b);
    },
    equality: function(a, b) {
      a = a.toLowerCase();
      b = b.toLowerCase();
      return a === b;
    }
  };
  /**
   * isMatch
   *
   * Validate a contact record against a list of terms by specified fields
   *
   * @param {Object} contact a contact record object.
   *
   * @param {Object} criteria fields and terms to validate a contact.
   *        - fields (fields of a contact record).
   *        - terms (terms to validate against contact record field values).
   * @param {Function} filterFn function accepts 2 arguments for
   *                             comparison.
   *
   */
  function isMatch(contact, criteria, filterFn) {
    /**
     * Validation Strategy
     *
     * 1. Let _found_ be a register of confirmed terms
     * 2. Let _contact_ be a contact record.
     * 3. For each _term_ [...input list], with the label _outer_
     *   - For each _field_ of [givenName, familyName]
     *     - For each _value_ of _contact_[ _field_ ]
     *       - Let _found_[ _term_ ] be the result of calling
     *         _filterFn_( _value_, _term_).
     *         - If _found_[ _term_ ] is **true**, continue to
     *           loop labelled _outer_
     * 4. If every value of _key_ in _found_ is **true** return **true**,
     *    else return **false**
    */
    var found = {};

    // The outer loop is specifically labelled to allow the
    // nested condition a way out of the second and third loop.
    outer:
    for (var i = 0, ilen = criteria.terms.length; i < ilen; i++) {
      var term = criteria.terms[i];
      for (var j = 0, jlen = criteria.fields.length; j < jlen; j++) {
        var field = criteria.fields[j];

        if (!contact[field]) {
          continue;
        }

        for (var k = 0, klen = contact[field].length; k < klen; k++) {
          var value = contact[field][k];
          if (typeof value.value !== 'undefined') {
            value = value.value;
          }

          if ((found[term] = filterFn(value.trim(), term))) {
            continue outer;
          }
        }
      }
    }

    // Pending the publication of a list of ES6 features available in Firefox
    // and deemed "safe enough" for FirefoxOS development, the above code is a
    // stand-in for what should be written as:
    // outer:
    // for (var term of criteria.terms) {
    //   for (var field of criteria.fields) {
    //     for (var value of contact[field]) {
    //       if (found[term] = value.toLowerCase().contains(term)) {
    //         continue outer;
    //       }
    //     }
    //   }
    // }
    return Object.keys(found).every(function(key) {
      return found[key];
    });
  }

  var rspaces = /\s+/;

  var Contacts = {
    findBy: function contacts_findBy(filter) {
      var filterValue = filter.filterValue ? filter.filterValue.trim() : '';

      if (!navigator.mozContacts || !filterValue.length) {
        /**
         * Bailout Strategy
         *
         * 1. A _missing_ filter.filterValue will results in an
         *    error when passed to mozContacts.find, bailing out
         *    early avoids the additional overhead of making a
         *    request that we know will fail.
         *
         * 2. Missing navigator.mozContacts API or empty but
         *    present filter.filterValue make the app useless,
         *    so prevent unpredictable state by making the
         *    result a no-op.
         *
         */
        return Promise.resolve([]);
      }

      /**
       * Lookup Strategy
       *
       * 1. Create a list of terms from the filterValue string
       *
       * 2. If only 1 term, set filterValue to that term.
       *
       * 3. If more than 1 term, find the length predominate term.
       *     a. let initial be an empty string
       *       (Do not use default first item in terms, or it will not
       *       be pushed into the lowercase list)
       *     b. For each term of terms
       *         i. Push lowercased term into a list of lowercased terms
       *         ii. If the current term.length is greater then initial.length,
       *             return the term, otherwise return the initial.
       *
       * 4. If filterValue.length is < 3, set the filterLimit to 10
       *
       * 5. Remove the length predominate term from the list of validation terms
       *
       * 6. Add back the original search value, this is needed for matching
       *     multi-word queries
       *
       * 7. Make a mozContact.find request with the length predominate term
       *     as the filter.filterValue.
       *
       * 8. In the mozContacts.find request success handler, filter the
       *     results by evaluating each contact record against
       *     the list of validation terms.
       */

      // Step 1
      var terms = filterValue.split(rspaces);
      var lower = [];

      // Step 2
      if (terms.length === 1) {
        filter.filterValue = terms[0];
      } else {
        filter.filterValue = terms.reduce(function(initial, term) {
          // Step 3.b.i
          // (used as a criteria list for isMatch)
          lower.push(term.toLowerCase());
          // Step 3.b.ii
          return term.length > initial.length ? term : initial;
          // Step 3.a
        }, '');
      }

      // Step 4
      if (filter.filterValue.length < 3) {
        filter.filterLimit = 10;
      }

      // Step 5
      lower.splice(lower.indexOf(filter.filterValue.toLowerCase()), 1);

      // Step 6
      // This would be much nicer using spread operator
      lower.push.apply(lower, terms);

      // Step 7
      return navigator.mozContacts.find(filter).then(function(result) {
        // Step 8
        if (terms.length > 1) {
          var fields = ['tel', 'givenName', 'familyName'];
          if (Settings.supportEmailRecipient) {
            fields.push('email');
          }
          var criteria = { fields: fields, terms: lower };
          return result.filter(
            (contact) => isMatch(contact, criteria, filterFns.contains)
          );
        }

        return result.slice();
      }, function(e) {
        console.warning('mozContacts.find failed %s', e.message || e.name);
        return [];
      });
    },

    findByString: function contacts_findBy(filterValue) {
      return Promise.all([
        this.findContactByString(filterValue),
        this.findByUnknown(filterValue)
      ]).then(function(contacts) {
        var knownContacts = contacts[0];
        var unknownContacts = contacts[1];

        return unknownContacts.length > 0 ?
          knownContacts.concat(unknownContacts) :
          knownContacts;
      });
    },

    findContactByString: function contacts_findBy(filterValue) {
      var props = ['tel', 'givenName', 'familyName'];
      if (Settings.supportEmailRecipient) {
        props.push('email');
      }
      return this.findBy({
        filterBy: props,
        filterOp: 'contains',
        filterValue: filterValue
      });
    },

    findByUnknown: function findByUnknown(filterValue) {
      var unknownContacts = [];

      for(var unknownNumber of unknownNumbers.values()) {
        //We only need at max 3 unknown contacts
        if (unknownContacts.length > 2) {
          break;
        }

        if (unknownNumber.contains(filterValue)) {
          unknownContacts.push({
            name: [unknownNumber],
            tel: [{value: unknownNumber}],
            source: 'unknown'
          });
        }
      }

      return Promise.resolve(unknownContacts);
    },

    findExact: function contacts_findBy(filterValue) {
      return this.findBy({
        filterBy: ['givenName', 'familyName'],
        filterOp: 'contains',
        filterValue: filterValue
      }).then(function(contacts) {
        if (contacts.length > 0) {
          var firstContact = contacts[0];

          var criteria = {
            fields: ['name'],
            terms: [filterValue]
          };

          var isExact = isMatch(firstContact, criteria, filterFns.equality);

          return isExact ? [firstContact] : [];
        }

        return contacts;
      });
    },

    findByPhoneNumber: function contacts_findByPhone(filterValue) {
      return this.findBy({
        filterBy: ['tel'],
        filterOp: 'match',
        filterValue: filterValue.replace(/\s+/g, '')
      }).then(function(contacts) {
        if (contacts.length > 0) {
          return contacts;
        }

        var deferred = Utils.Promise.defer();

        fb.getContactByNumber(filterValue, function fbByPhone(contact) {
          deferred.resolve(contact ? [contact] : []);
        }, function error_fbByPhone(err) {
          if (err.name !== 'DatastoreNotFound') {
            console.error('Error while retrieving fb by phone: ', err.name);
          }

          deferred.resolve([]);
        });

        return deferred.promise;
      });
    },

    findByAddress: function contacts_findByAddress(fValue) {
      if (Settings.supportEmailRecipient && Utils.isEmailAddress(fValue)) {
        return this.findExactByEmail(fValue);
      }

      return this.findByPhoneNumber(fValue);
    },

    findExactByEmail: function contacts_findExactByEmail(fValue) {
      return this.findBy({
        filterBy: ['email'],
        filterOp: 'equals',
        filterValue: fValue
      });
    },

    addUnknown: function addUnknown(number) {
      unknownNumbers.add(number);
    },

    clearUnknown: function clearUnknown() {
      unknownNumbers.clear();
    },

    getUnknownLength: function getUnknownLength() {
      return unknownNumbers.size;
    }
  };

  exports.Contacts = Contacts;
}(this));
