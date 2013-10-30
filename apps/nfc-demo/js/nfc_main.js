/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* Copyright © 2013, Deutsche Telekom, Inc. */


var isListening = false;

// Main Functions:
function handleWellKnownRecord(record) {
  if (record.type == nfc.rtd_text) {
    return handleTextRecord(record);
  } else if (record.type == nfc.rtd_uri) {
    return handleURIRecord(record);
  } else if (record.type == nfc.rtd_smart_poster) {
    return handleSmartPosterRecord(record);
  } else if (record.type == nfc.smartposter_action) {
    return handleSmartPosterAction(record);
  } else {
    console.log('Unknown record type: ' + record.type);
  }
}

function handleTextRecord(record) {
  var status = record.payload[0];
  var languageLength = status & nfc.rtd_text_iana_length;
  var language = nfc.toUTF8(record.payload.subarray(1, languageLength + 1));
  var encoding = status & nfc.rtd_text_encoding;
  var text;
  var encodingString;
  if (encoding == nfc.rtd_text_utf8) {
    text = nfc.toUTF8(record.payload.subarray(languageLength + 1));
    encodingString = 'UTF-8';
  } else if (encoding == nfc.rtd_text_utf16) {
    //TODO handle UTF16
    record.payload.substring(languageLength + 1);
    encodingString = 'UTF-16';
  }
  return {
      'action': 'Display text',
      'text': text,
      'language': language,
      'encoding': encodingString
    };
}

function handleURIRecord(record) {
  var prefix = nfc.uris[record.payload[0]];
  return {
      'action': 'Open URI',
      'uri': prefix + nfc.toUTF8(record.payload.subarray(1))
    };
}

function handleVCardRecord(record) {
  var payload = nfc.toUTF8(record.payload);
  var name = payload.substring(payload.indexOf('FN:') +
             'FN:'.length);
  name = name.substring(0, name.indexOf('\n'));
  var first = name.substring(0, name.indexOf(' '));
  var last = name.substring(name.indexOf(' ') + 1);
  var cell = payload.substring(payload.indexOf('CELL:') +
             'CELL:'.length);
  cell = cell.substring(0, cell.indexOf('\n'));
  return {
      'action': 'Add to contacts',
      'first': first,
      'last': last,
      'cell': cell
    };
}

function handleSmartPosterRecord(record) {
  var ret = new Array();
  do {
    var tnf = record.payload[0] & nfc.flags_tnf;

    var typeLength = record.payload[1];

    var payloadLength = 0;
    var isShortRecord = (record.payload[0] & nfc.flags_ss) > 0;
    if (isShortRecord) {
      payloadLength = record.payload[2];
    } else {
      payloadLength = (record.payload[2] << 32) +
                      record.payload[3];
    }

    var idLength = 0;
    var isIdPresent = (record.payload[0] & nfc.flags_il) > 0;
    if (isIdPresent) {
      idLength = record.payload.charCodeAt(isShortRecord ? 3 : 4);
    } else {
      idLength = 0;
    }

    var offset = 1 + 1 + (isShortRecord ? 1 : 2) + (isIdPresent ? 1 : 0);
    var type = record.payload.subarray(offset, offset + typeLength);
    offset += typeLength;

    var id = isIdPresent ?
             record.payload.subarray(offset, offset + idLength) : '';
    offset += idLength;

     var payload = record.payload.subarray(offset, offset + payloadLength);
     offset += payloadLength;

     var subrecord = {
         'tnf': tnf,
         'type': type,
         'id': id,
         'payload': payload
       };
     console.log('SUBRECORD: ' + JSON.stringify(subrecord));
     ret.push(subrecord);
     record.payload = record.payload.subarray(offset);
   } while (record.payload.length > 0);
   return { 'action': 'Smart Poster', 'records' : ret };
}

function handleSmartPosterAction(record) {
  // The recommended action has an application specific meaning:
  var action = record.payload[0];
  var recommendedAction;
  console.log('action in payload: ' + JSON.stringify(action));
  if (action == nfcSmartPoster.doAction) {
    recommendedAction = {'action': 'doTheAction'};
  } else if (action == nfcSmartPoster.saveForLaterAction) {
    recommendedAction = {'action': 'saveForLater'};
  } else if (action == nfcSmartPoster.openForEditingAction) {
    recommendedAction = {'action': 'openForEdit'};
  } else {
    recommendedAction = {'action': 'reservedAction'};
  }
  return recommendedAction;
}

function getRecordActionText(record, handle) {
  if (record.type == nfc.rtd_text) {
    return 'text: ' + handle.text + ' (Language: ' + handle.language +
           ', Encoding: ' + handle.encoding + ')';
  } else if (record.type == nfc.rtd_uri) {
    if (handle.uri.indexOf('tel') == 0) {
      return '<div class="dialer" href="' + handle.uri + '">' + handle.uri +
             '</div>';
    } else {
      return '<div class="actionuri" href="' + handle.uri + '">' +
             handle.uri + '</div>';
    }
  } else if (record.type == 'text/x-vCard') {
    return '<a href="javascript:addContact(\'' + handle.first + '\', \'' +
           handle.last + '\', \'' + handle.cell + '\')">' +
           'first name: ' + handle.first + '<br/>last name: ' + handle.last +
           '<br/>cell: ' + handle.cell + '</a>';
  } else if (record.type == nfc.smartposter_action) {
    return 'Recommended Action : ' + handle.action;
  }
}

function addContact(first, last, cell) {
  var contact = new mozContact();

  contact.givenName = first;
  contact.familyName = last;
  contact.name = contact.givenName + ' ' + contact.familyName;
  contact.tel = [{'type': 'Work', 'number' : '"' + cell + '"'}];
  contact.email = '';

  var req = navigator.mozContacts.save(contact);
  req.onsuccess = (function() {
    debug('Added contact successfully');
  });
}

function launchDialer(telurl) {
  var number = telurl.substring('tel:'.length);
  console.log('Adding number ' + number + ' to settings');
  if (navigator.mozSettings) {
    var request = navigator.mozSettings.createLock().set(
                    { 'nfc.dial_number': number});
    request.onsuccess = function() {
      launchDialerApp();
    };
    request.onerror = function() {
      console.log('error');
    };
  }
}

function launchDialerApp() {
  console.log('Searching for dialer app');
  navigator.mozApps.mgmt.getAll().onsuccess = function(e) {
    console.log('Got all apps');
    var apps = e.target.result;
    apps.forEach(function(app) {
      console.log('Discovered app: ' + app.origin);
      if (app.origin.indexOf('dialer') >= 0) {
        console.log('Launching dialer app');
        app.launch();
      }
    });
  };
}

function launchBrowser(URL) {
  // Launch web activity:
  var a = new MozActivity({
            name: 'view',
            data: {
              type: 'url',
              url: URL
            }
          });
      a.onsuccess = function() {
        debug('Activity sent to view with URL: ' + URL);
      };
      a.onerror = function() {
        alert('Failure going to URL:' + URL);
      };
}

function handleNdefDiscovered(activityData) {
  var nfcdom = window.navigator.mozNfc;
  var nfcTag = nfcdom.getNFCTag(activityData.sessionToken);
  nfcUI.nfcTag = nfcTag;

  switch (activityData.tech) {
    case 'P2P':
      // Process existing message.
      return handleNdefDiscoveredMessages(activityData.records);
      break;
    case 'NDEF':
      // Fall through
    case 'NDEF_FORMATTABLE':
      if (activityData.records === null) {
        // Process unread message.
        return handleNdefType(activityData.sessionToken, activityData.tech);
      } else {
        return handleNdefDiscoveredMessages(activityData.records);
      }
      break;
    case 'NFC_A':
      debug('Not implemented');
    case 'MIFARE_ULTRALIGHT':
      debug('Not implemented');
      break;
  }
  return false;
}

function handleNdefType(sessionToken, techType) {
  var handled = false;
  // Get a tag DOM object:
  var nfcTag = nfcUI.nfcTag;
  // connect:
  var connreq = nfcTag.connect(techType);
  connreq.onsuccess = function() {
    debug('Connect success!');
    var detailreq = nfcTag.getDetailsNDEF();
    debug('NDEF Details Request submitted.');
    detailreq.onsuccess = function() {
      // NDEF Message with array of NDEFRecords
      debug('Details NDEF success');
      debug('detailreq.result: ' + JSON.stringify(detailreq.result));
      var readreq = nfcTag.readNDEF();
      readreq.onsuccess = function() {
        debug('Read success.');
        debug('readreq: ' + JSON.stringify(readreq.result.records));
        // Update UI:
        handleNdefDiscoveredMessages(readreq.result.records);
        handled = true;
        var closeTagReq = nfcTag.close();
        closeTagReq.onerror = function() {
          debug('ERROR: unable to close tag.');
        };
      };
      readreq.onerror = function() {
        debug('ERROR: Failed to read NDEF on tag.');
      };
    };
    detailreq.onerror = function() {
      debug('ERROR: Failed to get NDEF details.');
    };
  };
  connreq.onerror = function() {
    debug('ERROR: connection failure');
  };
  return handled;
}

// NDEF only:
function handleNdefDiscoveredMessages(ndefmessage) {
  debug('Found tag!');

  if (ndefmessage === undefined) {
    debug('No messages in discovery.');
    var html = '<li data-role="list-divider" role="heading">NDEF Tag</li>';
    $('#taglist').html(html);
    $('#taglist').listview('refresh');
    return;
  }

  debug('Incoming message: ' + JSON.stringify(ndefmessage));
  debug('NdefMessage Length:' + ndefmessage.length);

  $('#taglist').css('display', 'inline');
  $('#actionlist').css('display', 'inline');

  var html = '<li data-role="list-divider" role="heading">NDEF Tag</li>';

  for (var i = 0; i < ndefmessage.length; i++) {
    var record = ndefmessage[i];
    console.log('RECORD: ' + JSON.stringify(record));

    //Dump generic data
    html += '<li data-theme="c">';
    html += 'tnf: ' + record.tnf + '<br/>';
    html += 'type: ' + record.type + '<br/>';
    html += 'id: ' + record.id + '<br/>';
    html += 'raw payload: ' + record.payload + '<br/>';
    html += '</li>';

    var action = '';
    if (record.tnf == nfc.tnf_well_known) {
      var handle = handleWellKnownRecord(record);
      action += '<li data-role="list-divider" role="heading">Action: ' +
               handle.action + '</li>';
      action += '<li data-theme="c">';
      if (record.type == nfc.rtd_smart_poster) {
        for (var j = 0; j < handle.records.length; j++) {
          var subRecord = handle.records[j];
          var subHandle = handleWellKnownRecord(subRecord);
          action += getRecordActionText(subRecord, subHandle);
          if (j < handle.records.length - 1) {
            action += '</li>';
            action += '<li data-theme="c">';
           }
         }
       } else {
         action += getRecordActionText(record, handle);
       }
       action += '</li>';
    } else if (record.tnf == nfc.tnf_absolute_uri) {
      action += '<li data-role="list-divider" role="heading">' +
                'Action: Open URI</li>';
      action += '<li data-theme="c">';
      handle = handleURIRecord(record);
      action += handle;
      action += '</li>';
    } else if (record.tnf == nfc.tnf_mime_media) {
      if (record.type == 'text/x-vCard') {
         action += '<li data-role="list-divider" role="heading">' +
                   'Action: Add to Contacts</li>';
         action += '<li data-theme="c">';
         action += getRecordActionText(record, handleVCardRecord(record));
         action += '</li>';
      }
    }
  }

  $('#taglist').html(html);
  $('#taglist').listview('refresh');

  $('#actionlist').html(action);
  $('.actionuri').each(function() {
    $(this).bind('click', function() {
      var URL = $(this).attr('href');
      launchBrowser(URL);
    });
  });
  $('.dialer').each(function() {
    $(this).bind('click', function() {
      var tel = $(this).attr('href');
      launchDialer(tel);
    });
  });
  $('#actionlist').listview('refresh');
}

function handleTechnologyDiscovered(sessionToken) {
  debug('Unimplemented NFC Technology Handler');
}

function handleTagDiscoveredMessages(sessionToken, nfcevent) {
  debug('Unimplemented NFC Tag Handler');
}

var dbgcnt = 0;
function debug(message) {
  dbgcnt++;
  console.log('DEBUG:(' + dbgcnt + ') ' + message);
  nfcUI.appendTextAndScroll($('#area'), '(' + dbgcnt + ') ' + message + '\n');
}

function setListenState(boolState) {
  if (boolState == true) {
    $('#buttontext').text('Stop Tag Discovery');
    isListening = true;
  } else {
    $('#buttontext').text('Start Tag Discovery');
    $('#taglist').css('display', 'none');
    $('#actionlist').css('display', 'none');
    isListening = false;
  }
}

/**
 * NfcActivityHandler is the entry point of all discovery messages.
 */
function NfcActivityHandler(activity) {
  debug('XX Activity Handler');

  var activityName = activity.source.name;
  var data = activity.source.data;
  nfcUI.setActivityData(data);

  debug('XX Received Activity: name: ' + activityName);
  switch (activityName) {
  case 'nfc-ndef-discovered':
    debug('XX Received Activity: nfc ndef message(s): ' +
          JSON.stringify(data.records));
    debug('XX Received Activity: data: ' + JSON.stringify(data));
    nfcUI.setConnectedState(true);
    // If there is a pending tag write, apply that write now.
    nfcUI.writePendingMessage();
    handleNdefDiscovered(data);
    break;
  case 'nfc-tech-discovered':
    debug('XX Received Activity: nfc technology message(s): ' +
          JSON.stringify(data.records));
    nfcUI.setConnectedState(true);
    // If there is a pending tag write, apply that write now.
    nfcUI.writePendingMessage();
    handleTechnologyDiscovered(data.sessionToken);
    break;
  case 'nfc-tag-discovered':
    debug('XX Received Activity: nfc tag message(s): ' +
          JSON.stringify(data.records));
    nfcUI.setConnectedState(true);
    handleTagDiscoveredMessages(data.sessionToken);
    break;
  case 'nfc-tech-lost':
    debug('XX Received Activity: nfc-tech-lost: ' +
          JSON.stringify(data));
    nfcUI.setConnectedState(false);
    break;
  case 'ndefpush-receive':
    debug('XX Received Activity: ndefpush-receive: ' +
          JSON.stringify(data));
    nfcUI.setConnectedState(true);
    break;
  }
}

// Main Document:
$(document).bind('ready', function() {
  nfcUI.setMessageArea('#area');
  $('#startbutton').bind('click', function(event, ui) {
    if (isListening != true) {
      setListenState(true);
    } else {
      setListenState(false);
    }
  });
  // By default, set to listening immediately.
  setListenState(true);

  navigator.mozSetMessageHandler('activity', NfcActivityHandler);

  $('#make_read_only_button').click(function(event) {
    nfcUI.makeReadOnlyNDEF();
  });

  // Attach event handlers to each ui action button:
  $('#button_nfc_empty_id').click(function(event) {
    nfcWriter.postEmptyTag();
  });
  $('#button_nfc_text_id').click(function(event) {
    nfcWriter.postTextFormtoNdef('#nfc_text_form_id');
  });
  $('#button_nfc_smartposter_url_id').click(function(event) {
    nfcWriter.postSmartPosterUriFormtoNdef('#nfc_smartposter_url_form_id');
  });
  $('#button_nfc_uri_id').click(function(event) {
    nfcWriter.postUriFormtoNdef('#nfc_uri_form_id');
  });
  $('#button_nfc_uri_tel_id').click(function(event) {
    nfcWriter.postUriFormtoNdef('#nfc_uri_tel_form_id');
  });
  $('#button_nfc_push_p2p_uri_id').click(function(event) {
    nfcUI.p2p = true;
    nfcWriter.postUriFormtoNdef('#nfc_uri_form_id');
    nfcUI.writePendingMessage();
  });
  $('#button_nfc_smartposter_email_id').click(function(event) {
    nfcWriter.postSmartPosterEmailFormtoNdef('#nfc_smartposter_email_form_id');
  });
  $('#button_nfc_email_id').click(function(event) {
    nfcWriter.postEmailFormtoNdef('#nfc_email_form_id');
  });
  $('#button_nfc_sms_id').click(function(event) {
    nfcWriter.postSmsFormtoNdef('#nfc_sms_form_id');
  });
  $('#button_nfc_contact_id').click(function(event) {
    nfcWriter.postContactFormToNdef('#nfc_contact_form_id');
  });

});

