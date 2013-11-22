/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* Copyright © 2013, Deutsche Telekom, Inc. */


var nfcSms = {

createSmsNdefRecord: function(sms) {

  var tnf = nfc.tnf_well_known;
  var type = nfc.rtd_uri;
  var id = new Uint8Array(0);

  // Payload:
  var prefix = 0x00; // No Prefix.
  var payloadUtf8 = String.fromCharCode(prefix) + 'sms:' + sms.phoneNumber +
                '?body=' + sms.message;
  var payload = nfc.fromUTF8(payloadUtf8);

  var record = new MozNdefRecord(
    tnf,
    type,
    id,
    payload);
  return record;
}

};
