/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

/* globals Components, marionetteScriptFinished */
/* exported Accessibility */

var Accessibility = {

  _accRetrieval: Components.classes[
    '@mozilla.org/accessibleRetrieval;1'].getService(
      Components.interfaces.nsIAccessibleRetrieval),

  _getAccessible:
    function Accessibility__getAccessible(element, callback, once) {
    let attempts = 500;
    let intervalId = setInterval(() => {
      let acc = this._accRetrieval.getAccessibleFor(element);
      if (acc || --attempts <= 0 || once) {
        clearInterval(intervalId);
        if (attempts <= 0) {
          let tagName = element ? element.tagName : undefined;
          let elemId = element ? element.id : undefined;
          console.log('accessibility.js: failed to get accessible for tag=\"' +
            tagName + '\" id=\"' + elemId + '\"');
        }
        try {
          callback(acc);
        } catch (e) {
          marionetteScriptFinished({ error: e.message });
        }
      }
    }, 10);
  },

  _matchState: function Accessibility__matchState(acc, stateName) {
    let stateToMatch = Components.interfaces.nsIAccessibleStates[stateName];
    let state = {};
    let extState = {};
    acc.getState(state, extState);
    return !!(state.value & stateToMatch);
  },

  click: function Accessibility_click(element) {
    this._getAccessible(element.wrappedJSObject, function(acc) {
      acc.doAction(0);
      marionetteScriptFinished();
    });
  },

  wheel: function Accessibility_wheel(element, direction) {
    let horizontal = direction === 'left' || direction === 'right';
    let page = (direction === 'left' || direction === 'up') ? 1 : -1;
    let event = new window.wrappedJSObject.WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaX: horizontal ? page : 0,
      deltaY: horizontal ? 0 : page,
      deltaMode: window.wrappedJSObject.WheelEvent.DOM_DELTA_PAGE,
    });
    element.wrappedJSObject.dispatchEvent(event);
  },

  isDisabled: function Accessibility_isDisabled(element) {
    this._getAccessible(element.wrappedJSObject, (acc) => {
      marionetteScriptFinished(
        { result: this._matchState(acc, 'STATE_UNAVAILABLE') });
    });
  },

  _isAriaHidden: function Accessibility__isAriaHidden(element) {
    do {
      if (JSON.parse(element.getAttribute('aria-hidden'))) {
        return true;
      }
      element = element.parentNode;
    } while (element && element.getAttribute);
  },

  isHidden: function Accessibility_isHidden(element) {
    let elem = element.wrappedJSObject;
    if (this._isAriaHidden(elem)) {
      marionetteScriptFinished({ result: true });
      return;
    }

    this._getAccessible(elem, (acc) => {
      if (!acc) {
        marionetteScriptFinished({ result: true });
        return;
      }
      marionetteScriptFinished(
        { result: this._matchState(acc, 'STATE_INVISIBLE') });
    }, true);
  },

  isVisible: function Accessibility_isVisible(element) {
    let elem = element.wrappedJSObject;
    if (this._isAriaHidden(elem)) {
      marionetteScriptFinished({ result: false });
      return;
    }

    this._getAccessible(elem, (acc) => {
      marionetteScriptFinished(
        { result: !this._matchState(acc, 'STATE_INVISIBLE') });
    });
  },

  getName: function Accessibility_getName(element) {
    this._getAccessible(element.wrappedJSObject, (acc) => {
      marionetteScriptFinished({ result: acc.name });
    });
  },

  getRole: function Accessibility_getRole(element) {
    this._getAccessible(element.wrappedJSObject, (acc) => {
      marionetteScriptFinished(
        { result: this._accRetrieval.getStringRole(acc.role) });
    });
  },
};
