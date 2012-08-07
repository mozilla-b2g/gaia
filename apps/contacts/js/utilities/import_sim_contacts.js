/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * Imports contacts stored in the SIM card and saves them into
 * navigator.mozContacts. Three steps => three callbacks:
 *   - onread: SIM card has been read properly;
 *   - onimport: contacts have been saved into navigator.mozContacts;
 *   - onerror: SIM card could not be read.
 */

function importSIMContacts(onread, onimport, onerror) {
  if (!window.navigator.mozContacts)
    return;

  // request contacts with getSimContacts() -- valid types are:
  //   'ADN': Abbreviated Dialing Numbers
  //   'FDN': Fixed Dialing Numbers
  var request = navigator.mozContacts.getSimContacts('ADN');

  request.onsuccess = function onsuccess() {
    if (onread) {
      onread();
    }

    var simContacts = request.result;
    var nContacts = simContacts.length;
    if (nContacts === 0) {
      if (onerror) {
        onerror();
      }
      return;
    }

    var nStored = 0;
    var count = function count() {
      nStored++;
      if (onimport && nStored >= nContacts) {
        onimport();
      }
    };

    for (var i = 0; i < nContacts; i++) {
      try { // trying to debug https://github.com/mozilla-b2g/gaia/issues/3196
        var name = simContacts[i].name;
        var tel = simContacts[i].tel;
        console.log('SIM card contact #' + i + '/' + nContacts + ': ' +
            tel + ' - ' + name);

        // https://bugzilla.mozilla.org/show_bug.cgi?id=779794
        // in a perfect world, request.result should be a mozContact array;
        // until then, let's build mozContact elements manually...
        var contact = new mozContact();
        contact.init({
          'name': name ? [unescapeGSMText(name.toString())] : [],
          'tel': tel ? [{
            'number': tel.toString(),
            'type': 'personal'
          }] : []
        });

        // store each mozContact
        var req = window.navigator.mozContacts.save(contact);
        req.onsuccess = count;
        //req.onerror = count;
        req.onerror = function() {
          console.warn('this SIM card contact could not be saved: ' + name);
          count();
        }
      } catch (e) {
        console.warn('this SIM card contact could not be imported: ' + name);
        count();
      }
    }
  };

  request.onerror = onerror;
}


/**
 * Two different kinds of charsets can be used in a SIM card.
 * http://en.wikipedia.org/wiki/GSM_03.38
 *
 *   1. GSM 7bit alphabet: TS 131.102
 *   http://d-chips.blogspot.fr/2012/06/gsm-7-bit-default-alphabet.html
 *
 *   2. UCS2 on UICC: TS 102.221
 *   http://d-chips.blogspot.fr/2012/06/coding-of-alpha-fields-in-sim-for-ucs2.html
 *
 * Of course, these two kinds of char encoding are used simultaneously. :-)
 */

function unescapeGSMText(str) {
  var gsm7bitCharMap = // warning, there's a non-break space in the next line
      '@£$¥èéùìòÇ\nØø\nÅåΔ_ΦΓΛΩΠΨΣΦΞ ÆæßÉ' +
      ' !"#¤%&\'()*+,-./0123456789:;<=>?' +
      '¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§' +
      '¿abcdefghijklmnopqrstuvwxyzäöñüà';

  var nUCS2 = 0; // number of UCS2 characters to read
  var pUCS2 = 0; // base pointer for the UCS2 (ignored atm)

  var out = '';
  var len = str.length;
  for (var i = 0; i < len; i++) {
    var code = str.charCodeAt(i);

    // early way out if NULL is found
    if (code === 0 && str.charCodeAt(i + 1) === 0) {
      return out;
    }

    // expecting a UCS-2 character?
    if (nUCS2 > 0) {
      if (code <= 0x7F) {
        out += gsm7bitCharMap.charAt(code);
      } else {
        //out += charAt(code);
        out += String.fromCharCode(code);
      }
      nUCS2--;
      continue;
    }

    /**
     * Found a GSM-7bit character
     *
     * The 128 base chars are defined like this:
     *
     *   @£$¥èéùìòÇ¹Øø²ÅåΔ_ΦΓΛΩΠΨΣΦΞ³ÆæßÉ
     *    !"#¤%&'()*+,-./0123456789:;<=>?
     *   ¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§
     *   ¿abcdefghijklmnopqrstuvwxyzäöñüà
     *
     * where:
     *   ¹ = LF, line feed (\n)
     *   ² = CR, carriage return (\r)
     *   ³ = ESC, extended character table (see below)
     *
     * There are national variants of this 'standard' table,
     * but they aren't supported by this library yet.
     */
    if (code <= 0x7F) {
      if (code === 0x1B && str.charCodeAt(i + 1) <= 0x7F) {
        // extended character table: read next byte
        code = str.charCodeAt(++i);
        console.log('extended char code found on SIM card: ' + code);
        if (code == 0x0A) {
          out += '\f';
        } else if (code == 0x14) {
          out += '^';
        } else if (code == 0x28) {
          out += '{';
        } else if (code == 0x29) {
          out += '}';
        } else if (code == 0x2F) {
          out += '\\';
        } else if (code == 0x3C) {
          out += '[';
        } else if (code == 0x3D) {
          out += '~';
        } else if (code == 0x3E) {
          out += ']';
        } else if (code == 0x65) {
          out += '€';
        } else {
          console.warn('unknown extended char code found on SIM card: ' + code);
        }
      } else {
        // GSM-7bit character (0x00 = @, 0x1B = nbsp)
        out += gsm7bitCharMap.charAt(code);
      }
    }

    /**
     * Found a UCS2 character.
     *
     * The first byte of a UCS2 sequence will have its 8th-bit set.
     * Three possible modes:
     *
     *   0x80 mode:
     *     the rest of the string is in UTF16-LE
     *
     *   0x81 mode:
     *     one byte [nUCS2] = nb of UCS2 chars
     *     one byte [pUCS2] = base pointer for bit15 to bit8 for the UCS2
     *     + [nUCS2] characters in UCS2 or GSM-7bit
     *
     *   0x82 mode: nb of UCS2 chars + 16-bit base pointer
     *     one byte [nUCS2] = nb of UCS2 chars
     *     two bytes [pUCS2] = 16-bit base pointer for the UCS2
     *     + [nUCS2] characters in UCS2 or GSM-7bit
     *
     * The 0x81 mode is partially supported (= works when base pointer == 1),
     * other UCS2 modes aren't tested yet - and probably don't work properly.
     * A script like this one might help:
     * http://www.onicos.com/staff/iz/amuse/javascript/expert/utf.txt
     */
    else {
      if (code == 0x80) {
        nUCS2 = Infinity; // the rest of the string should be in UTF16-LE
        console.log('untested UCS2/0x80 mode');
      } else if (code == 0x81) {
        nUCS2 = str.charCodeAt(++i); // number of expected UCS2 characters
        pUCS2 = str.charCodeAt(++i); // ignored, but hoping for 1
        if (pUCS2 != 1) {
          console.log('untested UCS2/0x81 mode - pUCS2 = ' + pUCS2);
        }
      } else if (code == 0x82) {
        nUCS2 = str.charCodeAt(++i); // number of expected UCS2 characters
        pUCS2 = str.charCodeAt(++i); // ignored
        console.log('untested UCS2/0x82 mode - pUCS2 = ' + pUCS2);
      } else {
        console.log('unexpected UCS2 char code found on SIM card: ' + code);
        //out += charAt(code);
        out += String.fromCharCode(code);
      }
    }
  }

  return out;
}

