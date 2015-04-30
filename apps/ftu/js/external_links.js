/* exported localizeLink */
'use strict';

function localizeLink(element, key) {
  var _ = navigator.mozL10n.get;

  element.innerHTML = _(key);

  // External links definition
  var refs = {
    'learn-more-telemetry2': {
      href: 'https://www.mozilla.org/telemetry',
      textContent: 'www.mozilla.org/telemetry',
      className: 'external'
    },
    'learn-more-information2': {
      href: 'https://www.mozilla.org/privacy',
      textContent: 'www.mozilla.org/privacy',
      className: 'external'
    },
    'learn-more-privacy2': {
      href: 'https://www.mozilla.org/privacy/firefox-os',
      l10nId: 'learn-more-privacy-link',
      className: 'external'
    },
    'htmlWelcome2': {
      href: '#about-your-rights',
      l10nId: 'htmlWelcome-link'
    },
    'helpImprove2': {
      href: 'https://www.mozilla.org/privacy/firefox-os',
      l10nId: 'helpImprove-link',
      className: 'external'
    }
  };

  var link = element.getElementsByTagName('a')[0];
  if (!link) {
    return;
  }

  // Returning the data-l10n attributes for link "key"
  var linkRef = refs[key];
  for (var prop in linkRef) {
    if (prop == 'l10nId') {
      link.textContent = _(linkRef.l10nId);
    } else if (prop == 'textContent') {
      link.textContent = linkRef[prop];
    } else {
      link.setAttribute(prop, linkRef[prop]);
    }
  }
}
