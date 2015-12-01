/* global MozActivity */
/* exported openLink */
'use strict';

/**
 * Open a link with a web activity
 */
function openLink(url) {
  /* jshint nonew: false */
  if (url.startsWith('tel:')) { // dial a phone number
    new MozActivity({
      name: 'dial',
      data: { type: 'webtelephony/number', number: url.substr(4) }
    });
  } else if (!url.startsWith('#')) { // browse a URL
    new MozActivity({
      name: 'view',
      data: { type: 'url', url: url }
    });
  }
}
