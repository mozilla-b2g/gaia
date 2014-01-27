/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var Accessibility = {
  _getAccessible: function Accessibility__getAccessible(element, callback) {
    let gAccRetrieval = SpecialPowers.Cc["@mozilla.org/accessibleRetrieval;1"].
          getService(SpecialPowers.Ci.nsIAccessibleRetrieval);
    let attempts = 0;
    let intervalId = setInterval(function () {
      let acc = gAccRetrieval.getAccessibleFor(element);
      if (acc || ++attempts > 10) {
        clearInterval(intervalId);
        callback(acc);
      }
    }, 10);
  },

  click: function Accessibility_click(element) {
    this._getAccessible(element.wrappedJSObject,
                       function(acc) {
                         acc.doAction(0);
                         marionetteScriptFinished();
                       });
  },

  isHidden: function Accessibility_isHidden(element) {
    let elem = element.wrappedJSObject;
    do {
      if (JSON.parse(elem.getAttribute('aria-hidden'))) {
        marionetteScriptFinished(true);
        return;
      }

      elem = elem.parentNode;
    } while (elem && elem.getAttribute);

    this._getAccessible(
      element.wrappedJSObject,
      function(acc) {
        if (!acc) {
          marionetteScriptFinished(true);
          return;
        }
        let invisible = SpecialPowers.wrap(SpecialPowers.Components).interfaces.
              nsIAccessibleStates.STATE_INVISIBLE;
        let state = {};
        acc.getState(state, {});
        marionetteScriptFinished(!!(state & invisible));
      });
  }
};
