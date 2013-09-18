/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* Copyright © 2013, Deutsche Telekom, Inc. */


var nfcText = {

createTextNdefRecord_Utf8: function(text, lang) {
  var tnf = nfc.tnf_well_known;
  var type = nfc.rtd_text;
  var id = null;

  // Payload:
  var prefix = 0x02;
  var payload = String.fromCharCode(prefix) + lang + text;

  var record = new MozNdefRecord(
    tnf,
    type,
    id,
    payload
  );
  return record;
}

};
