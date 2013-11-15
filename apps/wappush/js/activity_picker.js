/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global MozActivity */

(function(exports) {
'use strict';

function activityDefaultError(event) {
  console.warn('Unhandled error spawning activity: ' +
               event.target.error.message + '\n');
}

function tryActivity(opts, onsuccess, onerror) {
  var activity;

  if (typeof onerror !== 'function') {
    onerror = activityDefaultError;
  }

  if (window.MozActivity) {
    activity = new MozActivity(opts);

    if (typeof onsuccess === 'function') {
      activity.onsuccess = onsuccess;
    }

    activity.onerror = onerror;
  }
}

var ActivityPicker = {
  url: function ap_browse(url, onsuccess, onerror) {
    var params = {
      name: 'view',
      data: {
        type: 'url',
        url: url
      }
    };

    tryActivity(params, onsuccess, onerror);
  }
};

exports.ActivityPicker = ActivityPicker;

}(this));
