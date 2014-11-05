'use strict';

var contacts = window.contacts || {};

contacts.adaptAndMerge = function(incomingContact, matches, callbacks) {
  var listIds = Object.keys(matches);
  var totalMatches = listIds.length;

  // First contact here we take as the master
  var masterContact = matches[listIds[0]].matchingContact;
  var matchingContacts = [];
  for (var j = 1; j < totalMatches; j++) {
    matchingContacts.push(matches[listIds[j]]);
  }
  // Finally the last matching is the incoming itself
  // XXX: it has no `matchings` entry as it does not come from the matching
  // algorithm.
  // Now only used here but consider to provide a constructor in the future.
  matchingContacts.push({
    matchingContact: incomingContact
  });

  contacts.Merger.merge(masterContact, matchingContacts, callbacks);
};
