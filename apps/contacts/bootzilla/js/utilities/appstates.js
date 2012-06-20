/*
 *  Module: Application States.
 *
 *  This module associates stylesheets with application states. Developers should
 *  set the state using the 'date-state' attribute in the <body> element.
 *  Automatically, the platform enable the stylesheet associated with the current
 *  state.
 *
 *  From HTML murkup:
 *    <body data-state="myState">
 *
 *  From Javascript:
 *    document.body.dataset.state = 'myState';
 *
 *  Product: Open Web Device
 *
 *  Copyright(c) 2012 Telefónica I+D S.A.U.
 *
 *  LICENSE: TBD
 *
 *  @author Cristian Rodriguez (crdlc@tid.es)
 *
 * @example (Markup)
 *
 *  <head>
 *    <meta charset="UTF-8">
 *    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
 *    <link href="default.css" rel="stylesheet">
 *    <link href="example1.css" data-state="example1" rel="stylesheet">
 *    <link href="example2.css" data-state="example2" rel="stylesheet">
 *    <style data-state="example3">
 *      <!-- my styles -->
 *    </style>
 *  </head>
 *
 */
var owd = window.owd || {};

if(!owd.appStates) {

  (function(doc) {
    'use strict';

    var AppStates = owd.appStates = {};

    // Map {state -> styleSheet}
    var styleSheets = {};

    // Current state
    var currentState = undefined;

    var dataStateAttr = 'data-state';

    var done = false;

    function loaded() {
      if (!done && doc.readyState !== 'loading') {
        done = true;
        window.removeEventListener('DOMContentLoaded', loaded);
        exec();
      }
    }

    if (doc.readyState !== 'loading') {
      exec();
    } else {
      window.addEventListener('DOMContentLoaded', loaded);
      window.setTimeout(loaded, 50);
    }

    function exec() {
      // Disable all styleSheets associated with states
      addStyles(doc.querySelectorAll('link[data-state]'));
      addStyles(doc.querySelectorAll('style[data-state]'));

      var body = doc.querySelector('body');

      // Does <body> element have inital state?
      var state = body.dataset.state;
      if (state) {
        AppStates.set(state);
      }

      // Listening for changes on <body> element
      body.addEventListener('DOMAttrModified', function(evt) {
        if (evt.attrName === dataStateAttr) {
          AppStates.set(evt.newValue);
        }
      });
    }

    /*
     *  Holds and disables stylesheets
     *
     *  @param {String} stylesheets
     *
     */
    function addStyles(styles) {
      var len = styles.length;
      for (var i = 0; i < len; i++) {
        var styleSheet = styles[i];
        styleSheet.disabled = true;
        styleSheets[styleSheet.dataset.state] = styleSheet;
      }
    }

    /*
     *  Sets the current application state.
     *  Unknown states disable all stylesheets.
     *
     *  @param {String} state
     *
     */
    AppStates.set = function(state) {
      if (currentState) {
        styleSheets[currentState].disabled = true;
      }

      var styleSheet = styleSheets[state];
      if (styleSheet) {
        styleSheet.disabled = false;
        currentState = state;
      } else {
        currentState = undefined;
      }
    }

  })(document);
}