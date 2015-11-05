'use strict';
define(function(require) {

var contacts = navigator.mozContacts;

function makeResult(query, contacts) {
  return {
    query: query,
    contacts: contacts
  };
}

/**
 * Finds matches for the given query in the name and email for known people.
 * Returns a promise that resolves to an object that has the query and a
 * "match" array of mozContact entries. The match array will be a zero length
 * array for no matches. See this bug about expanding the data source beyond
 * contacts matches:
 * https://bugzilla.mozilla.org/show_bug.cgi?id=1188710
 * @param  {String} query the name/email query to use.
 * @return {Promise}
 */
return function match(query) {
  return new Promise(function(resolve, reject) {
    if (!contacts || !query) {
      return resolve(makeResult(query, []));
    }

    var request = contacts.find({
      filterBy: ['email', 'name', 'givenName', 'familyName'],
      filterOp: 'startsWith',
      // Do not overwhelm the user with choice, limit the results. It is likely
      // easier for the user to keep typing to narrow the matches than scroll
      // through a big list, and a small bound on the results will result in
      // better performance, even when generating the UI for the matches.
      filterLimit: 30,
      filterValue: query
    });

    request.onsuccess = function () {
      resolve(makeResult(query, this.result));
    };

    // It is OK to just eat errors, no need to show them in the UI, but let
    // the log know for debugging purposes.
    request.onerror = function (err) {
      console.error('autocomplete_source contacts.find error: ' + err);
      resolve(makeResult(query, []));
    };
  });
};

});
