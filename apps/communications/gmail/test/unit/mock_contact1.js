'use strict';

// refer to mock_contact1.xml for the entry XML we are getting.

var MockGoogleEntry = (function MockGoogleEntry() {
  var req = new XMLHttpRequest();
  req.open('GET', '/gmail/test/unit/mock_contact1.xml', false);
  req.send(null);

  var entryBuffer = req.responseText;
  var parser = new DOMParser();
  return parser.parseFromString(entryBuffer, 'text/xml');
})();

var MockGoogleEntryNoName = (function MockGoogleEntryNoName() {
  var req = new XMLHttpRequest();
  req.open('GET', '/gmail/test/unit/mock_contact2.xml', false);
  req.send(null);

  var entryBuffer = req.responseText;
  var parser = new DOMParser();
  return parser.parseFromString(entryBuffer, 'text/xml');
})();

var MockGoogleEntryInvalidDate = (function MockGoogleEntryWoName() {
  var req = new XMLHttpRequest();
  req.open('GET', '/gmail/test/unit/mock_contact3.xml', false);
  req.send(null);

  var entryBuffer = req.responseText;
  var parser = new DOMParser();
  return parser.parseFromString(entryBuffer, 'text/xml');
})();
