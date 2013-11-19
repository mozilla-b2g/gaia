/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* Copyright © 2013, Deutsche Telekom, Inc. */


'use strict';

function includeJS(elementContainer) {

  var scripts = new Array(
    'js/nfc_consts.js',
    'js/records/nfc_text.js',
    'js/records/nfc_uri.js',
    'js/records/nfc_sms.js',
    'js/records/nfc_smartposter.js',
    'js/nfc_writer.js',
    'js/nfc_ui.js',
    'js/nfc_main.js'
  );
  for (var i = 0; i < scripts.length; i++) {
    var element = document.createElement('script');
    element.type = 'text/javascript';
    element.src = scripts[i];
    elementContainer.appendChild(element);
  }
}

// Include scripts at head:
includeJS(document.getElementsByTagName('head')[0]);
