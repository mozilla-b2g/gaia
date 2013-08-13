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
  var id = null;

  // Payload:
  var prefix = 0x00; // No Prefix.
  var payload = String.fromCharCode(prefix) + 'sms:' + sms.phoneNumber +
                '?body=' + sms.message;

  var record = new NdefRecord(
    tnf,
    type,
    id,
    payload);
  return record;
}

};
