/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global MozActivity */

'use strict';

function openSettings() {
  var activity = new MozActivity({
    name : 'configure',
    data : {
      target : 'device',
      section: 'icc'
    }
  });
  activity.onerror = function (e) {
    console.warn('There was a problem opening settings: '+e);
  };
}

function checkSTKMenuAvailable(callback) {
   var reqApplications = window.navigator.mozSettings.createLock().get(
    'icc.applications');
  reqApplications.onsuccess = function icc_getApplications() {
    var json = reqApplications.result['icc.applications'];
    var menu = json && JSON.parse(json);
    if (!menu || typeof menu !== 'object' || Object.keys(menu).length === 0) {
      callback(false);
    } else {
      callback(true);
    }
  };
  reqApplications.onerror = function icc_getApplicationsError() {
    callback(false);
  };
}

window.onload = function() {
  // Check if we've a STK Menu (en settings)
  checkSTKMenuAvailable(function(StkAvailable) {
    if (StkAvailable) {
      // Open Settings in STK page
      openSettings();
    } else {
      alert('Stk not available');
    }
    window.close();
  });
};
