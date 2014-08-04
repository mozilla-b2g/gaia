'use strict';

/* exported MockGoogleGroups */

/*

  This mock represents the following google contacts response
  for groups of contacts. See mock_groups.xml.

*/

var MockGoogleGroups = (function MockGoogleGroups() {
  var req = new XMLHttpRequest();
  req.open('GET', '/contacts/test/unit/import/gmail/mock_groups.xml', false);
  req.send(null);

  var entryBuffer = req.responseText;
  var parser = new DOMParser();
  var listing = parser.parseFromString(entryBuffer, 'text/xml');

  return listing;

})();
