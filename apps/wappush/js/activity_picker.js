/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global MozActivity */

(function(exports) {
'use strict';

function activityDefaultError(event) {
  console.warn('Unhandled error spawning activity: ' +
               event.target.error.message + '\n');
}

var ActivityPicker = {
  url: function ap_browse(url, onsuccess, onerror) {
    if (typeof onerror !== 'function') {
      onerror = activityDefaultError;
    }

    if (window.MozActivity) {
      var activity = new MozActivity({
        name: 'view',
        data: {
          type: 'url',
          url: url
        }
      });

      if (typeof onsuccess === 'function') {
        activity.onsuccess = onsuccess;
      }

      activity.onerror = onerror;
    }
  }
};

exports.ActivityPicker = ActivityPicker;

}(this));
