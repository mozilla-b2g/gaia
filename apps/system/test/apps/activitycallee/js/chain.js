/* global MozActivity */
/* jshint nonew: false */
'use strict';

var activityOutput = document.getElementById('activityresult');

document.getElementById('launchwindowactivity')
  .addEventListener('click', function() {
    var activityRequest = new MozActivity({
      name: 'test-chain-window'
    });
    activityRequest.onsuccess = function onSuccess() {
      activityOutput.setAttribute('value', activityRequest.result);
    };
  });


document.getElementById('launchwindowactivitynoreturnvaluewithpost')
  .addEventListener('click', function() {
    var activityRequest = new MozActivity({
      name: 'test-noreturnvalue-with-postresult-activity'
    });
    activityRequest.onsuccess = function onSuccess() {
      activityOutput.setAttribute('value', activityRequest.result);
    };
  });


