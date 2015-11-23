/* global Services */
'use strict';
/**
 * This mock is intended to switch split-view mode on if needed. Under the hood
 * it just forwards user from default launch path to the split Inbox view
 * index.html file.
 * @module
 */
Services.obs.addObserver(function(document) {
  if (!document || !document.location ||
      document.location.origin !== 'app://sms.gaiamobile.org') {
    return;
  }

  // Switch to split-view mode Inbox instead.
  if (document.location.pathname === '/index.html') {
    document.location.replace('/views/inbox/index.html');
  }
}, 'document-element-inserted', false);
