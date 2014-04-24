/* exported getLocalizedLink */
'use strict';

function getLocalizedLink(key) {
  // External links definition
  var refs = {
    'learn-more-telemetry': {
      href: 'https://www.mozilla.org/telemetry/',
      textContent: 'www.mozilla.org/telemetry/',
      className: 'external'
    },
    'learn-more-information': {
      href: 'https://www.mozilla.org/privacy/',
      textContent: 'www.mozilla.org/privacy/',
      className: 'external'
    },
    'learn-more-privacy': {
      href: 'https://www.mozilla.org/privacy/firefox-os/',
      l10nId: 'learn-more-privacy-link',
      className: 'external'
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
