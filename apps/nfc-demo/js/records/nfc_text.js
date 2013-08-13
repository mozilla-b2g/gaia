var nfcText = {

createTextNdefRecord_Utf8: function(text, lang) {
  var tnf = nfc.tnf_well_known;
  var type = nfc.rtd_text;
  var id = null;

  // Payload:
  var prefix = 0x02;
  var payload = String.fromCharCode(prefix) + lang + text;

  var record = new NdefRecord(
    tnf,
    type,
    id,
    payload
  );
  return record;
}

};
