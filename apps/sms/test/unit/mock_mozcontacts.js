// Do not use the native API.
var MockMozContacts = {
  mHistory: [],
  find: function(filter) {
    // attribute DOMString     filterValue;    // e.g. "Tom"
    // attribute DOMString     filterOp;       // e.g. "contains"
    // attribute DOMString[]   filterBy;       // e.g. "givenName"
    // attribute DOMString     sortBy;         // e.g. "givenName"
    // attribute DOMString     sortOrder;      // e.g. "descending"
    // attribute unsigned long filterLimit;
    if (!(this instanceof navigator.mozContacts.find)) {
      return new navigator.mozContacts.find(filter);
    }
    var onsuccess, onerror;

    navigator.mozContacts.mHistory.push({
      // make a "copy" of the filter object
      filter: Object.keys(filter).reduce(function(copy, key) {
        return (copy[key] = filter[key]) && copy;
      }, {}),
      request: this
    });

    this.result = null;
    this.error = null;

    Object.defineProperties(this, {

      onsuccess: {
        // When the success handler gets assigned:
        //  1. Set this.result to an array containing a MockContact instance
        //  2. Immediately call the success handler
        // This will behave like a _REALLY_ fast DB query
        set: function(callback) {
          onsuccess = callback;
          if (callback !== null) {
            // Implement a mock that gives results that appear to
            // match the real behaviour of filtered contacts results
            this.result = (function() {
              // Supports the error case
              if (filter == null ||
                    (!filter.filterOp || !filter.filterValue)) {
                return null;
              }

              // Supports two "no match" cases
              if (filter.filterValue === '911' ||
                  filter.filterValue === 'wontmatch') {
                return [];
              }

              if (filter.filterValue === 'jane') {
                return MockContact.list([
                  // true
                  { givenName: ['Jane'], familyName: ['D'] },
                  // false
                  { givenName: ['jane'], familyName: ['austen'] },
                  // true
                  { givenName: ['jane'], familyName: ['doe'] },
                  // false
                  { givenName: ['jane'], familyName: ['fonda'] },
                  // true
                  { givenName: ['jane'], familyName: ['dow'] },
                  // false
                  { givenName: ['janet'], familyName: [''] }
                ]);
              }

              if (filter.filterValue === 'do') {
                return MockContact.list([
                  // true
                  { givenName: ['Jane'], familyName: ['Doozer'] },
                  // false
                  { givenName: ['doug'], familyName: ['dooley'] },
                  // true
                  { givenName: ['jane'], familyName: ['doe'] },
                  // false
                  { givenName: ['jerry'], familyName: ['doe'] },
                  // true
                  { givenName: ['j'], familyName: ['dow'] },
                  // true
                  { givenName: ['john'], familyName: ['doland'] }
                ]);
              }

              // All other cases
              return MockContact.list();
            }());

            if (this.result === null) {
              this.error = {
                name: 'Mock missing filter params'
              };
              if (onerror) {
                setTimeout(function() {
                  onerror.call(this);
                  onerror = null;
                }.bind(this), 0);
              }
            } else {
              setTimeout(function() {
                onsuccess.call(this);
                onsuccess = null;
              }.bind(this), 0);
            }
          }
        }
      },

      onerror: {
        set: function(callback) {
          onerror = callback;
          if (callback !== null) {
            if (this.result === null && this.error !== null) {
              setTimeout(function() {
                onerror.call(this);
                onerror = null;
              }.bind(this), 0);
            }
          }
        }
      }
    });
  }
};
