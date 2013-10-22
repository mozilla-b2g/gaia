/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* Copyright © 2013, Deutsche Telekom, Inc. */


var nfcSmartPoster = {

// Action Record Values:
doAction: 0x00,
saveForLaterAction: 0x01,
openForEditingAction: 0x02,
RFUAction: 0x03, // Reserved from 0x03 to 0xFF

// There is no specified standard for field order for the parts of the email
// message. Example format: email URI followed by the action requesting that the
// reciever send it.
// mail parameter format:
// {
//   "mailto" : emailAddress,
//   "subject" : subjectLine,
//   "body" : emailMessageBody
// }
// Action: See constants of nfcSmartPoster.
createEmailNdefRecord: function(aEmail, aTitle, aAction) {
  var records;

  var tnf = nfc.tnf_well_known;
  var type = nfc.rtd_smart_poster;
  var id = null;
  var payload = null;

  // Sub-payload byte strings attached to main payload
  var uriRec = this.createEmailUriRecord(aEmail);
  var actionRec = this.createActionRecord(aAction);
  var titleRec = this.createTitleRecord(aTitle);

  var payloadUtf8 = uriRec + actionRec + titleRec;
  payload = nfc.fromUTF8(payloadUtf8);
  
  var main = new MozNdefRecord(
    tnf,
    type,
    id,
    payload
  );
  return main;
},

// Title is formatted: {"title": title, "lang": lang}
createUriNdefRecord: function(aUri, aTitle, aAction) {
  var records;

  var tnf = nfc.tnf_well_known;
  var type = nfc.rtd_smart_poster;
  var id = null;
  var payload = null;

  // Sub-payload byte strings attached to main payload
  var uriRec = this.createUriRecord(aUri);
  var actionRec = this.createActionRecord(aAction);
  var titleRec = this.createTitleRecord(aTitle);

  payload = uriRec + actionRec + titleRec;

  var main = new MozNdefRecord(
    tnf,
    type,
    id,
    payload
  );

  return main;
},

// TODO: Get bytestrings generated directly by nfc library

// Email (a type of URI): Sub-record (byte string short record)
createEmailUriRecord: function(aEmail) {
  var uriRec = null;
  var prefix = 0x06; // mailto: URI
  var uri = aEmail.mailto + '?' + 'subject=' + aEmail.subject + '&' +
            'body' + aEmail.body;
  uriRec = String.fromCharCode(nfc.tnf_well_known | nfc.flags_ss) +
           String.fromCharCode(nfc.rtd_uri.length) +
           String.fromCharCode(1 + uri.length);
  uriRec += nfc.rtd_uri + String.fromCharCode(prefix) + uri;
  return uriRec;
},

// URI: Sub-record (byte string short record)
createUriRecord: function(aUri) {
  var uriRec = null;
  var split = nfcUri.lookupUrlRecordType(aUri);
  uriRec = String.fromCharCode(nfc.tnf_well_known | nfc.flags_ss) +
           String.fromCharCode(nfc.rtd_uri.length) +
           String.fromCharCode(1 + split.uri.length);
  uriRec += nfc.rtd_uri + String.fromCharCode(split.identifier) + split.uri;
  return uriRec;
},

// Action: Sub-record (byte string short record)
createActionRecord: function(aAction) {
  if (aAction === undefined) {
    return null;
  } else if ((aAction >= this.doAction) && (aAction < this.RFUAction)) {
    actionRec = String.fromCharCode(nfc.tnf_well_known | nfc.flags_ss) +
                String.fromCharCode(3) + String.fromCharCode(1);
    actionRec += 'act' + String.fromCharCode(aAction);
  } else {
    debug('Invalid action number');
    return null;
  }
  return actionRec;
},

// Title: Sub-record (byte string short record)
createTitleRecord: function(aTitle) {
  var title = aTitle.title;
  var lang = aTitle.lang;
  if (title == null || title === undefined) {
    return null;
  }
  var titlePayloadLen = 1 + 1 + lang.length + title.length;
  titleRec = String.fromCharCode(nfc.tnf_well_known | nfc.flags_ss) +
             String.fromCharCode(nfc.rtd_text.length) +
             String.fromCharCode(titlePayloadLen);
  titleRec += nfc.rtd_text + String.fromCharCode(lang.length) +
              lang + title;

  return titleRec;
}

};
