/* global MozActivity */
/* jshint nonew: false */
'use strict';

document.getElementById('launchactivity')
  .addEventListener('click', function() {
    new MozActivity({
      name: 'test-alert'
    });
  });

document.getElementById('testchainactivity')
  .addEventListener('click', function() {
    new MozActivity({
      name: 'test-chain-inline'
    });
  });

document.getElementById('close').addEventListener('click', function() {
  window.close();
});
