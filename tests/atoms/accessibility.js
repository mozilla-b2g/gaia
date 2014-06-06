/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

var Accessibility = {
  _getAccessible: function Accessibility__getAccessible(element, callback) {
    let gAccRetrieval = SpecialPowers.Cc[
      "@mozilla.org/accessibleRetrieval;1"].getService(
        SpecialPowers.Ci.nsIAccessibleRetrieval);
    let attempts = 0;
    let intervalId = setInterval(function() {
      let acc = gAccRetrieval.getAccessibleFor(element);
      if (acc || ++attempts > 10) {
        clearInterval(intervalId);
        callback(acc);
      }
    }, 10);
  },

  _matchState: function Accessibility__matchState(acc, stateName) {
    let stateToMatch = SpecialPowers.wrap(
      SpecialPowers.Components).interfaces.nsIAccessibleStates[stateName];
    let state = {};
    let extState = {};
    acc.getState(state, extState);
    marionetteScriptFinished(!!(state.value & stateToMatch));
  },

  click: function Accessibility_click(element) {
    this._getAccessible(element.wrappedJSObject, function(acc) {
      acc.doAction(0);
      marionetteScriptFinished();
    });
  },

  isDisabled: function Accessibility_isDisabled(element) {
    this._getAccessible(element.wrappedJSObject, (acc) => {
      this._matchState(acc, 'STATE_UNAVAILABLE');
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

    this._getAccessible(element.wrappedJSObject, (acc) => {
      if (!acc) {
        marionetteScriptFinished(true);
        return;
      }
      this._matchState(acc, 'STATE_INVISIBLE');
    });
  },

  getName: function Accessibility_getName(element) {
    this._getAccessible(element.wrappedJSObject, (acc) => {
      marionetteScriptFinished(acc.name);
    });
  },

  getRole: function Accessibility_getRole(element) {
    this._getAccessible(element.wrappedJSObject, (acc) => {
      let gAccRetrieval = SpecialPowers.Cc[
        "@mozilla.org/accessibleRetrieval;1"].getService(
          SpecialPowers.Ci.nsIAccessibleRetrieval);
      marionetteScriptFinished(gAccRetrieval.getStringRole(acc.role));
    });
  },
};
