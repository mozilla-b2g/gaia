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
