/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* jshint moz:true */
/* jshint unused:true */
/* global InputMethods */

(function() {
  'use strict';

  var keyboard;
  var buffer = '';
  var BACKSPACE = 8;

  var M = {
    consoTT: new RegExp('^(' +
             '\u1000|\u1001|\u1002|\u1003|\u1005|\u1006|\u1007|\u1008|' +
             '\u1009|\u100A|\u100B|\u100C|\u100D|\u100E|\u100F|\u1010|' +
             '\u1011|\u1012|\u1013|\u1014|\u1015|\u1016|\u1017|\u1018|' +
             '\u1019|\u101A|\u101B|\u101C|\u101D|\u101E|\u101F|\u1020|' +
             '\u1021' + ')$'),
    consoSA: new RegExp('^(' +  '\u101E' + ')$'),
    vowelIA: new RegExp('^(' +
             '\u102D|\u102E|\u1032|\u1036|\u102F|\u1030|\u102B|\u102C' + ')$'),
    vowelIU: new RegExp('^(' +  '\u102D|\u102E|\u102F|\u1030' + ')$'),
    vowelSI: new RegExp('^(' +  '\u102D|\u102E' + ')$'),
    vowelIN: new RegExp('^(' +  '\u1032|\u1036' + ')$'),
    vowelUU: new RegExp('^(' +  '\u102F|\u1030' + ')$'),
    vowelAA: new RegExp('^(' +  '\u102B|\u102C' + ')$'),
    vowelSU: new RegExp('^(' +  '\u1025' + ')$'),
    vowelDU: new RegExp('^(' +  '\u1026' + ')$'),
    vowelSO: new RegExp('^(' +  '\u1029' + ')$'),
    vowelSA: new RegExp('^(' +  '\u102C' + ')$'),
    vowelDI: new RegExp('^(' +  '\u102E' + ')$'),
    vowelSE: new RegExp('^(' +  '\u1031' + ')$'),
    vowelAI: new RegExp('^(' +  '\u1032' + ')$'),
    vowelAN: new RegExp('^(' +  '\u1036' + ')$'),
    vowelAU: new RegExp('^(' +  '\u1037' + ')$'),
    vowelVT: new RegExp('^(' +  '\u1038|\u103A' + ')$'),
    vowelVS: new RegExp('^(' +  '\u1038' + ')$'),
    vowelVR: new RegExp('^(' +  '\u1039' + ')$'),
    vowelAT: new RegExp('^(' +  '\u103A' + ')$'),
    mediaYH: new RegExp('^(' +  '\u103B|\u103C|\u103D|\u103E' + ')$'),
    mediaYW: new RegExp('^(' +  '\u103B|\u103C|\u103D' + ')$'),
    mediaYR: new RegExp('^(' +  '\u103B|\u103C' + ')$'),
    mediaYA: new RegExp('^(' +  '\u103B' + ')$'),
    mediaRA: new RegExp('^(' +  '\u103C' + ')$'),
    mediaWA: new RegExp('^(' +  '\u103D' + ')$'),
    mediaHA: new RegExp('^(' +  '\u103E' + ')$'),
    zeroLEN: new RegExp('^(' +  '\u200B' + ')$')
  };

//==================================================================
//  \u103D + \u103E + \u1031 + \u103B => $4 + $1 + $2 + $3
//  \u103D + \u103E + \u1031 + \u103C => $4 + $1 + $2 + $3
//  \u103D + \u1031 + \u103B => $3 + $1 + $2
//  \u103D + \u1031 + \u103C => $3 + $1 + $2
//  \u103D + \u103E + \u103B => $3 + $1 + $2
//  \u103D + \u103E + \u103C => $3 + $1 + $2
//  \u103E + \u1031 + \u103B => $3 + $1 + $2
//  \u103E + \u1031 + \u103C => $3 + $1 + $2
//  \u103E + \u1031 + \u103D => $3 + $1 + $2
//  \u1031 + \u1039 + consoTT[*] => $2 + $3 + $1
//  \u200B + \u1031 + consoTT[*] => $3 + $2
//  \u1031 + mediaYH[*] => $2 + $1
//  \u1036 + \u1032 => $2 +$1
//  \u1037 + vowelSI[*] => $2 + $1
//  \u1037 + vowelIN[*] => $2 + $1
//  \u1037 + vowelAA[*] => $2 + $1
//  \u1037 + vowelUU[*] => $2 + $1
//  \u1038 + \u1037 => $2 + $1
//  \u103A + \u1037 => $2 + $1
//  \u103D + \u103B => $2 + $1
//  \u103D + \u103C => $2 + $1
//  \u103E + \u103B => $2 + $1
//  \u103E + \u103C => $2 + $1
//  \u103E + \u103D => $2 + $1
//  vowelUU[*] + vowelSI[*] => $2 + $1
//  vowelIN[*] + vowelUU[*] => $2 + $1
//  vowelIN[*] + vowelSI[*] => $2 + $1
//==================================================================
  var SWAP_RULE = [
    // p1 + p2 + p3 + p4 => p4 + p1 + p2 + p3
    { num: 4, out: 4, t:1, p1: M.mediaWA, p2: M.mediaHA, p3: M.vowelSE,
      p4: M.mediaYR },
    // p1 + p2 + p3 => p3 + p2
    { num: 3, out: 2, t:1, p1: M.zeroLEN, p2: M.vowelSE, p3: M.consoTT },
    // p1 + p2 + p3 => p3 + p1 + p2
    { num: 3, out: 3, t:1, p1: M.mediaWA, p2: M.vowelSE, p3: M.mediaYR },
    { num: 3, out: 3, t:1, p1: M.mediaWA, p2: M.mediaHA, p3: M.mediaYR },
    { num: 3, out: 3, t:1, p1: M.mediaHA, p2: M.vowelSE, p3: M.mediaYW },
    // p1 + p2 + p3 => p2 + p3 + p1
    { num: 3, out: 3, t:2, p1: M.vowelSE, p2: M.vowelVR, p3: M.consoTT },
    // p1 + p2 => p2 + p1
    { num: 2, out: 2, t:1, p1: M.vowelSE, p2: M.mediaYH },
    { num: 2, out: 2, t:1, p1: M.vowelAN, p2: M.vowelAI },
    { num: 2, out: 2, t:1, p1: M.vowelAU, p2: M.vowelIA },
    { num: 2, out: 2, t:1, p1: M.vowelVT, p2: M.vowelAU },
    { num: 2, out: 2, t:1, p1: M.vowelUU, p2: M.vowelSI },
    { num: 2, out: 2, t:1, p1: M.vowelIN, p2: M.vowelIU },
    { num: 2, out: 2, t:1, p1: M.mediaWA, p2: M.mediaYR },
    { num: 2, out: 2, t:1, p1: M.mediaHA, p2: M.mediaYW }
  ];

//==================================================================
//  \u1025 + \u102E => \u1026
//  \u1025 + \u103A => \u1009 + \u103A
//  \u101E + \u103C + \u1031 + \u102C + \u103A => \u102A
//==================================================================
  var ADD_RULE = [
    { num: 2, out: '\u1026', p1: M.vowelSU, p2: M.vowelDI },
    { num: 2, out: '\u1009\u103A', p1: M.vowelSU, p2: M.vowelAT },
    { num: 5, out: '\u102A', p1: M.consoSA, p2: M.mediaRA, p3: M.vowelSE,
      p4: M.vowelSA, p5: M.vowelAT }
  ];

//==================================================================
//  \u1039 + consoTT[*] + \u1031 + < VK_BACK > => \u1039 + $filler + \u1031
//  \u200B + consoTT[*] + \u1031 + < VK_BACK > => $filler + \u1031
//  mediaYH[*] + \u1031 + < VK_BACK > => \u1031
//  \u1039 + consoTT[*] + < VK_BACK > => NULL
//  \u200B + \u1031 + < VK_BACK > => NULL
//==================================================================
  var DEL_RULE = [
    {num: 3, out: '\u1031\u1039', p1: M.vowelVR, p2: M.consoTT, p3: M.vowelSE},
    {num: 2, out: '\u200B\u1031', p1: M.consoTT, p2: M.vowelSE},
    {num: 2, out: '\u1031', p1: M.mediaYH, p2: M.vowelSE},
    {num: 2, out: '', p1: M.vowelVR, p2: M.consoTT},
    {num: 2, out: '', p1: M.zeroLEN, p2: M.vowelSE}
  ];

  function myanParser(rule, callback) {
    var idx = ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'];
    var len = buffer.length;

    if (len < 2) {
      return null;
    }

    for (var i = 0; i < rule.length; i++) {
      if (len < rule[i].num) {
         continue;
      }
      var c = len - 1;
      for (var j = rule[i].num; j > 0; j--) {
        if (!buffer[c--].match( rule[i][idx[j]] )) {
          break;
        }
      }
      if (j === 0) {
        return callback(rule[i]);
      }
    }

    return null;
  }

  function processBuffer(callback) {
    var swap = myanParser(SWAP_RULE, function(entry) {
      if (!entry) {
        return null;
      }
      var len = buffer.length;
      var tail = entry.t;
      var out = entry.out;
      var s = {};
      s.num = entry.num;
      s.str = buffer.substr(len-tail, tail) +
              buffer.substr(len-out, out-tail);
      return s;
    });

    // After process swap, check if the string need to be merged.
    var adds = myanParser(ADD_RULE, function(entry) {
      if (!entry) {
        return null;
      }
      var s = {};
      s.num = entry.num;
      s.str = entry.out;
      return s;
    });

    return (adds) ? callback(adds) : callback(swap);
  }

  function doDelete(callback) {
    var dels = myanParser(DEL_RULE, function(entry) {
      if (!entry) {
        return null;
      }
      var s = {};
      s.num = entry.num;
      s.str = entry.out;
      return s;
    });

    return (dels) ? callback(dels) : false;
  }

  function overrideInput(s) {
    if(s) {
      keyboard.replaceSurroundingText(s.str, -s.num, s.num);
      return true;
    }

    return false;
  }

  InputMethods.myanmar = {
    init: function(interfaceObject) {
      keyboard = interfaceObject;
    },

    click: function(keycode) {

      keyboard.setUpperCase({
          isUpperCase: false
      });

      if (keycode == BACKSPACE) {
        if(!doDelete(overrideInput)) {
          keyboard.sendKey(keycode);
        }
      }
      else {
        if (String.fromCharCode(keycode) == '\u1031') {
          // Send an extra zero length space on click of vowel sign E.
          keyboard.sendKey('\u200B'.charCodeAt(0));
        }
        keyboard.sendKey(keycode);
      }
    },

    surroundingtextChange: function(detail) {
      buffer = detail.beforeString;
      processBuffer(overrideInput);
    }
  };

})();
