'use strict';

/*

  This mock represents the following google contacts response
  for a list of contacts. See mock_listing.xml.

*/

var MockGoogleListing = (function MockGoogleListing() {
  var req = new XMLHttpRequest();
  req.open('GET', '/gmail/test/unit/mock_listing.xml', false);
  req.send(null);

  var entryBuffer = req.responseText;
  var parser = new DOMParser();
  var listing = parser.parseFromString(entryBuffer, 'text/xml');

  return listing;

})();
