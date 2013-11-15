/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* Copyright © 2013, Deutsche Telekom, Inc. */


/* URL NDEF tag */
// Depends on nfc_consts.js

var nfcUri = {

// Returns a json object matching record type.
lookupUrlRecordType: function(uri) {
  // Skip the first value, which is not used.
  for (var i = 1; i < nfc.uris.length; i++) {
    var len = nfc.uris[i].length;
    if (uri.substring(0, len) == nfc.uris[i]) {
      uriPayload = uri.substring(len);
      return {'identifier' : i, 'uri' : uriPayload};
    }
  }
  return {'identifier' : 0, 'uri' : uri};
},

// Creates a single non-Array NdefRecord for a URL.
// Abbreviate will shorten the protocol of that url
createUriNdefRecord: function(uri, abbreviate) {
  var uriPayload = null;
  if (uri == null) {
    return null;
  }

  // Take each known URI type prefix, and check against URL.
  // It is appropriate to do deeper checking in the application
  // context to check prefixes.
  if (abbreviate == true) {
    var split = this.lookupUrlRecordType(uri);
    if (split.identifier == 0) {
      urlPayload = uri; // unmodified.
    } else {
      urlPayload = String.fromCharCode(split.identifier) + split.uri;
    }
  } else {
    urlPayload = uri; // unmodified.
  }
  console.log('Current URL payload: ' + urlPayload);

  var tnf = nfc.tnf_well_known; // NFC Forum Well Known type
  var type = nfc.rtd_uri; // URL type
  var id = new Uint8Array(0);
  var payload = nfc.fromUTF8(urlPayload);

  var record = new MozNdefRecord(
    tnf,
    type,
    id,
    payload
  );
  return record;
},

//
// mail parameter format:
// {
//   'mailto' : emailAddress,
//   'subject' : subjectLine,
//   'body' : emailMessageBody
// }
//
createEmailNdefRecord: function(mail) {
  var records;

  var tnf = nfc.tnf_well_known;
  var type = nfc.rtd_uri;
  var id = new Uint8Array(0);
  var payload = null;

  // Construct email payload:
  var prefix = 0x06; // mailto: URI
  var uri = mail.mailto + '?' + 'subject=' + mail.subject + '&' +
            'body' + mail.body;
  payload = nfc.fromUTF8(String.fromCharCode(prefix) + uri);

  var main = new MozNdefRecord(
    tnf,
    type,
    id,
    payload
  );
  return main;
}


}; // end nfcUri
