'use strict';

/*
 * You need the following pref for this to work.
 * 'devtools.debugger.forbid-certified-apps': false
 */

var fs = require('fs');
var atom = fs.readFileSync('./tests/atoms/reflow.js', {encoding: 'utf-8'});

var ReflowHelper = function(client) {
  var chrome = client.scope({ context: 'chrome' });
  chrome.executeScript(atom);

  this.startTracking = function(manifestURL) {
    chrome.executeAsyncScript(function(url) {
      window.MozReflowAtom.startTracking(url, marionetteScriptFinished);
    }, [manifestURL]);
  };

  this.stopTracking = function() {
    chrome.executeAsyncScript(function() {
      window.MozReflowAtom.stopTracking(marionetteScriptFinished);
    });
  };

  this.getCount = function() {
    return chrome.executeScript(function() {
      return window.MozReflowAtom.getCount();
    });
  };
};

module.exports = ReflowHelper;
