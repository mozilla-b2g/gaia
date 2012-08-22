
'use strict';

// Homescreen
let init = getFile(GAIA_DIR, "apps", "homescreen", "js", "init.json");

function makeURL(name) {
  return GAIA_SCHEME + name + "." + GAIA_DOMAIN + (GAIA_PORT ? GAIA_PORT : "");
}

let content = {
  grid: [
    [ // page 1
      makeURL("email"),
      makeURL("video"),
      makeURL("camera"),
      makeURL("gallery"),
      makeURL("music"),
      makeURL("calendar"),
      makeURL("calculator"),
      makeURL("settings"),
      makeURL("clock"),
      makeURL("fm"),
      makeURL("pdfjs"),
      "https://marketplace.mozilla.org/telefonica/"
    ]
  ],
  dock: [
    makeURL("dialer"),
    makeURL("sms"),
    makeURL("contacts"),
    makeURL("browser")
  ]
}

writeContent(init, JSON.stringify(content));

