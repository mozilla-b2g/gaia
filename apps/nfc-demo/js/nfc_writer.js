/**
 *  NDef tag write functions and form to NdefRecord handlers
 */
var nfcWriter = {

NdefWrite: function(message) {
  console.log('Writing raw message to Nfc: ' + message);
  navigator.mozNfc.sendToNfcd(message);
},

validateNdefTagRecords: function(ndefRecords) {
  if (ndefRecords instanceof Array) {
    return navigator.mozNfc.validateNdefTag(ndefRecords);
  } else {
    return false;
  }
},

/**
 * Returns a request object. To observe the result, define and
 * attach callbacks taking an event to the request's onsuccess
 * and onerror.
 */
writeRecordArrayTag: function(ndefRecords, p2p) {
  if (ndefRecords == null) {
    return null;
  }
  if (!p2p) {
    var domreq = navigator.mozNfc.ndefWrite(ndefRecords);
    console.log('Returned from writeNdefTag call');
    return domreq;
  } else {
    var domreq = navigator.mozNfc.ndefPush(ndefRecords);
    console.log('Returned from ndefPush call');
    nfcUI.p2p = false;
    return domreq;
  }
},

/**
 * NDEF well known types:
 */

// Text Example:
textFormToNdefRecord: function(elementRef) {
  var text = $(elementRef + ' > .text').val();
  record = nfcText.createTextNdefRecord_Utf8(text, 'en');
  return record;
},

// URL:
urlFormToNdefRecord: function(elementRef, abbreviate) {
  var uri = $(elementRef + ' > .uri').val();
  record = nfcUri.createUriNdefRecord(uri, abbreviate);
  return record;
},

// SmartPoster URI:
smartPosterUriFormToNdefRecord: function(elementRef) {
  var title = $(elementRef + ' > .title').val();
  var uri = $(elementRef + ' > .uri').val();
  var titlelang = $(elementRef + ' > .titleLang').val();
  var aTitle = {'title': title, 'lang': titlelang};
  record = nfcSmartPoster.createUriNdefRecord(
    uri, aTitle, nfcSmartPoster.doAction);
  return record;
},

// Email:
emailFormToNdefRecord: function(elementRef) {
  var mailto = $(elementRef + ' > .emailMailTo').val();
  var subject = $(elementRef + ' > .emailSubject').val();
  var body = $(elementRef + ' > .emailBody').val();
  record = nfcUri.createEmailNdefRecord(
    {'mailto' : mailto, 'subject' : subject, 'body' : body});
  return record;
},

// SmartPoster Email:
smartPosterEmailFormToNdefRecord: function(elementRef) {
  var title = $(elementRef + ' > .title').val();
  var titlelang = $(elementRef + ' > .titleLang').val();
  var mailto = $(elementRef + ' > .emailMailTo').val();
  var subject = $(elementRef + ' > .emailSubject').val();
  var body = $(elementRef + ' > .emailBody').val();
  var aTitle = {'title': title, 'lang': titlelang};
  record = nfcSmartPoster.createEmailNdefRecord(
    {'mailto' : mailto, 'subject' : subject, 'body' : body},
    aTitle, nfcSmartPoster.doAction);
  return record;
},

// SMS:
smsFormToNdefRecord: function(elementRef) {
  var phoneNumber = $(elementRef + ' > .smsPhoneNumber').val();
  var message = $(elementRef + ' > .smsMessage').val();
  record = nfcSms.createSmsNdefRecord(
    {'phoneNumber' : phoneNumber, 'message' : message});
  return record;
},


// Basic Contact Example
// Format reference:
//   http://www.w3.org/TR/2012/WD-contacts-api-20120712/#the-contact-dictionary
contactFormToNdefRecord: function(elementRef) {
  var tnf = nfc.tnf_mime_media;
  var type = $(elementRef + ' > .nfc_contact_type').val();
  var id = $(elementRef + ' > .nfc_contact_id').val();

  /* payload */
  var fname = $(elementRef + ' > .nfc_contact_payload_name_first').val();
  var lname = $(elementRef + ' > .nfc_contact_payload_name_last').val();
  var mname1 = $(elementRef + ' > .nfc_contact_payload_name_middle_1').val();
  var mname2 = $(elementRef + ' > .nfc_contact_payload_name_middle_2').val();

  var fullname = $(elementRef + ' > .nfc_contact_payload_name_fullname').val();
  var telephone = $(elementRef + ' > .nfc_contact_payload_telephone').val();
  var mobile = $(elementRef + ' > .nfc_contact_payload_mobile').val();
  var email = $(elementRef + ' > .nfc_contact_payload_email').val();
  var address = $(elementRef + ' > .nfc_contact_payload_address').val();


  console.log('Form processing Results: ' +
              'FirstName: ' + fname + ' LastName: ' + lname +
              ' MiddleName1: ' + mname1 + ' MiddleName2: ' + mname2 +
              ' FullName: ' + fullname + ' Telephone: ' + telephone +
              ' Mobile: ' + mobile + ' Email: ' + email +
              ' Address: ' + address);

  // payload:
  var payload = 'BEGIN:VCARD\n';

  payload += 'VERSION:2.1\n'; // Version 3.0, 4.0, jcard, xcard, etc.
  payload += 'N:' + lname + ';' + fname + ';' + mname1 + ';' + mname2 + ';\n';
  payload += 'FN:' + fname + ' ' + lname + '\n';

  if (email) {
    payload += 'EMAIL:' + email + '\n';
  }

  if (telephone) {
    payload += 'TEL:' + telephone + '\n';
  }

  if (mobile) {
    payload += 'TEL;TYPE:cell:' + mobile + '\n';
  }

  if (address) {
    payload += 'ADR;HOME:' + address + '\n';
  }

  payload += 'END:VCARD';

  var record = new NdefRecord(
    tnf,
    type,
    id,
    payload
  );

  return record;
},


// NFC Message Posting:
postTextFormtoNdef: function(elementRef) {
  var records = new Array();
  var record = this.textFormToNdefRecord(elementRef);
  records.push(record);
  // Check:
  if (nfcWriter.validateNdefTagRecords(records) == false) {
    var message = 'NdefRecord is invalid';
    nfcUI.appendTextAndScroll($('#area'), message + '\n');
    return;
  }
  nfcUI.postPendingMessage(records);
},

postSmartPosterUriFormtoNdef: function(elementRef) {
  var records = new Array();
  var record = this.smartPosterUriFormToNdefRecord(elementRef);
  records.push(record);
  // Check:
  if (nfcWriter.validateNdefTagRecords(records) == false) {
    var message = 'NdefRecord is invalid';
    nfcUI.appendTextAndScroll($('#area'), message + '\n');
    return;
  }
  nfcUI.postPendingMessage(records);
},

postUriFormtoNdef: function(elementRef) {
  var records = new Array();
  var record = this.urlFormToNdefRecord(elementRef, true);
  records.push(record);
  // Check:
  if (nfcWriter.validateNdefTagRecords(records) == false) {
    var message = 'NdefRecord is invalid';
    nfcUI.appendTextAndScroll($('#area'), message + '\n');
    return;
  }
  nfcUI.postPendingMessage(records);
},

postSmartPosterEmailFormtoNdef: function(elementRef) {
  var records = new Array();
  var record = this.smartPosterEmailFormToNdefRecord(elementRef);
  records.push(record);
  // Check:
  if (nfcWriter.validateNdefTagRecords(records) == false) {
    var message = 'NdefRecord is invalid';
    nfcUI.appendTextAndScroll($('#area'), message + '\n');
    return;
  }
  nfcUI.postPendingMessage(records);
},

postEmailFormtoNdef: function(elementRef) {
  var records = new Array();
  var record = this.emailFormToNdefRecord(elementRef);
  records.push(record);
  // Check:
  if (nfcWriter.validateNdefTagRecords(records) == false) {
    var message = 'NdefRecord is invalid';
    nfcUI.appendTextAndScroll($('#area'), message + '\n');
    return;
  }
  nfcUI.postPendingMessage(records);
},

postSmsFormtoNdef: function(elementRef) {
  var records = new Array();
  var record = this.smsFormToNdefRecord(elementRef);
  records.push(record);
  // Check:
  if (nfcWriter.validateNdefTagRecords(records) == false) {
    var message = 'NdefRecord is invalid';
    nfcUI.appendTextAndScroll($('#area'), message + '\n');
    return;
  }
  nfcUI.postPendingMessage(records);
},

postContactFormToNdef: function(elementRef) {
  // postContactArrayTag will post a contact array as the payload.
  var record = this.contactFormToNdefRecord(elementRef);
  var records = new Array();
  records.push(record);
  if (nfcWriter.validateNdefTagRecords(records) == false) {
    var message = 'NdefRecord is invalid';
    nfcUI.appendTextAndScroll($('#area'), message + '\n');
    return;
  }
  nfcUI.postPendingMessage(records);
},

// Empty Tag:
postEmptyTag: function() {
  var records = [new NdefRecord(nfc.tnf_empty, nfc.rtd_text, null, null)];
  nfcUI.postPendingMessage(records);
}

}; // nfcWriter
