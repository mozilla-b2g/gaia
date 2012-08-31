
'use strict';

// Homescreen
let init = getFile(GAIA_DIR, 'apps', 'homescreen', 'js', 'init.json');

function makeURL(name, ep) {
  var url = GAIA_SCHEME + name + '.' + GAIA_DOMAIN + (GAIA_PORT ? GAIA_PORT : '');
  url += ep? ('/' + ep) : '';
  return url;
}

let content = {
  grid: [
    [ // page 1
      makeURL("camera"),
      makeURL("gallery"),
      makeURL("fm"),
      makeURL("settings"),
      "https://marketplace.mozilla.org/telefonica/"
    ],
    [ // page 2
      makeURL("calendar"),
      makeURL("clock"),
      makeURL("costcontrol"),
      makeURL("email"),
      makeURL("music"),
      makeURL("video"),
      makeURL("calculator"),
      makeURL("pdfjs")
    ]
  ],
  dock: [
    makeURL('communications', 'dialer'),
    makeURL('sms'),
    makeURL('communications', 'contacts'),
    makeURL('browser')
  ]
}

writeContent(init, JSON.stringify(content));

