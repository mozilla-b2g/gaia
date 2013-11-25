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
  var id = new Uint8Array(0);

  var payloadLen = 1 /*status*/ + lang.length + text.length;
  var payload = new Uint8Array(payloadLen);

  // Payload:
  var k = 0;
  payload[k++] = 0x02;
  for (var i = 0; i < lang.length; i++) {
    payload[k++] = lang.charCodeAt(i);
  }
  for (var i = 0; i < text.length; i++) {
    payload[k++] = text.charCodeAt(i);
  }

  var record = new MozNdefRecord(
    tnf,
    type,
    id,
    payload
  );
  return record;
}

};
