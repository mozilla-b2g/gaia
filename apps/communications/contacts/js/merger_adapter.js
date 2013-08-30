'use strict';

var contacts = window.contacts || {};

// Take an incoming contact (contact not in the device) and a set of (at least
// 1) device contacts and adapt them to fit as paremeters of the merge() method.
//
// The merge() method waits for a master contact and a list of matching results.
//
// In addition to the callbacks, adaptAndMerge() accepts another optional
// parameter specifying which contact must be the master one. If omitted or
// falsy it is assumed the incomingContact must be the master. If specified,
// then it must be a matches's index.
//
// The operation may alter matches set and incomingContact parameters.
contacts.adaptAndMerge =
function(incomingContact, matches, callbacks, masterId) {
  var listIds = Object.keys(matches);
  var totalMatches = listIds.length;
  var masterMatching, masterContact, currentId;

  // Select the master contact.
  if (!masterId) {
    masterContact = incomingContact;
  }
  else {
    masterMatching = matches[masterId];
    if (!masterMatching) {
      var reason = '`masterId` does not belong to any matching contact.';
      console.error(reason);
      callbacks.error(reason);
      return;
    }
    masterContact = masterMatching.matchingContact;
    matches[masterId] = undefined;
  }

  // Convert matches set into a list.
  var matching, matchingContacts = [];
  for (var j = 0; j < totalMatches; j++) {
    matching = matches[listIds[j]];
    matching && matchingContacts.push(matching);
  }

  // If no master, add the incoming with the lowest priority.
  if (incomingContact !== masterContact) {
    matchingContacts.push({
      matchingContact: incomingContact
      // It has no `matchings` entry as it does not come from the matching
      // algorithm. Now only used here but consider to provide a constructor in
      // the future.
    });
  }

  contacts.Merger.merge(masterContact, matchingContacts, callbacks);
};
