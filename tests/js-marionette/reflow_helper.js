'use strict';
/* global require, module */
/*
 * You need the following pref for this to work.
 * 'devtools.debugger.forbid-certified-apps': false
 *
 * And also the follow settings.
 * 'devtools.overlay': true
 * 'hud.reflows': true
 */

var fs = require('fs');
var atom = fs.readFileSync('./tests/atoms/reflow.js', {encoding: 'utf-8'});

var ReflowHelper = function(client) {
  var chrome = client.scope({ context: 'chrome' });
  chrome.executeScript(atom);
  client.setContext('content');

  this.startTracking = function(manifestURL) {
    chrome.executeScript(function(url) {
      window.MozReflowAtom.startTracking(url);
    }, [manifestURL]);
  };

  this.stopTracking = function() {
    chrome.executeScript(function() {
      window.MozReflowAtom.stopTracking();
    });
  };

  this.getCount = function() {
    return chrome.executeScript(function() {
      return window.MozReflowAtom.count;
    });
  };
};

module.exports = ReflowHelper;
