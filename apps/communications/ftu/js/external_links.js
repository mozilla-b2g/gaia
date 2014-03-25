/* exported getLocalizedLink */
'use strict';

function getLocalizedLink(key) {
  // External links definition
  var refs = {
    'learn-more-telemetry': {
      linkUrl: 'https://www.mozilla.org/telemetry/',
      textContent: 'www.mozilla.org/telemetry/',
      cssClass: 'external'
    },
    'learn-more-information': {
      linkUrl: 'https://www.mozilla.org/privacy/',
      textContent: 'www.mozilla.org/privacy/',
      cssClass: 'external'
    },
    'learn-more-privacy': {
      linkUrl: 'https://www.mozilla.org/privacy/firefox-os/',
      l10nId: 'learn-more-privacy-link',
      cssClass: 'external'
    }
  };

  // Returning the HTML code for link "key"
  var link = document.createElement('a');
  var linkRef = refs[key];
  for (var prop in linkRef) {
    if (prop == 'l10nId') {
      link.textContent = navigator.mozL10n.get(linkRef.l10nId);
    } else {
      link[prop] = linkRef[prop];
    }
  }
  return link.outerHTML;
}
