/* exported getLocalizedLink */
'use strict';

function getLocalizedLink(key) {
  // External links definition
  var refs = {
    'learn-more-telemetry': {
      href: 'https://www.mozilla.org/telemetry',
      textContent: 'www.mozilla.org/telemetry',
      className: 'external'
    },
    'learn-more-information': {
      href: 'https://www.mozilla.org/privacy',
      textContent: 'www.mozilla.org/privacy',
      className: 'external'
    },
    'learn-more-privacy': {
      href: 'https://www.mozilla.org/privacy/firefox-os',
      l10nId: 'learn-more-privacy-link',
      className: 'external'
    },
    'htmlWelcome': {
      href: '#about-your-rights',
      l10nId: 'htmlWelcome-link'
    },
    'helpImprove': {
      href: 'https://www.mozilla.org/privacy/firefox-os',
      l10nId: 'helpImprove-link',
      className: 'external'
    }
  };

  // Returning the data-l10n attributes for link "key"
  var linkRef = refs[key];
  var dataL10nAttrs = {};
  var _ = navigator.mozL10n.get;
  for (var prop in linkRef) {
    if (prop == 'l10nId') {
      dataL10nAttrs.textContent = _(linkRef.l10nId);
    } else {
      dataL10nAttrs[prop] = linkRef[prop];
    }
  }

  if (!dataL10nAttrs.hasOwnProperty('className')) {
    dataL10nAttrs.className = '';
  }

  return dataL10nAttrs;
}
