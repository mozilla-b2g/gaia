'use strict';

const PREFERRED_ICON_SIZE = 60;
const GAIA_CORE_APP_SRCDIR = 'apps';
const GAIA_EXTERNAL_APP_SRCDIR = 'external-apps';
const INSTALL_TIME = 132333986000; // Match this to value in webapp-manifests.js

// Initial Homescreen icon descriptors.

// c.f. the corresponding implementation in the Homescreen app.
function bestMatchingIcon(preferred_size, manifest, origin) {
  var icons = manifest.icons;
  if (!icons) {
    return undefined;
  }

  var preferredSize = Number.MAX_VALUE;
  var max = 0;

  for (var size in icons) {
    size = parseInt(size, 10);
    if (size > max)
      max = size;

    if (size >= PREFERRED_ICON_SIZE && size < preferredSize)
      preferredSize = size;
  }
  // If there is an icon matching the preferred size, we return the result,
  // if there isn't, we will return the maximum available size.
  if (preferredSize === Number.MAX_VALUE)
    preferredSize = max;

  var url = icons[preferredSize];
  if (!url) {
    return undefined;
  }

  // If the icon path is not an absolute URL, prepend the app's origin.
  if (url.indexOf('data:') == 0 ||
      url.indexOf('app://') == 0 ||
      url.indexOf('http://') == 0 ||
      url.indexOf('https://') == 0)
    return url;

  return origin + url;
}

function iconDescriptor(directory, app_name, entry_point) {
  let origin = gaiaOriginURL(app_name);
  let manifestURL = gaiaManifestURL(app_name);

  // For external/3rd party apps that don't use the Gaia domain, we have an
  // 'metadata.json' file that specifies the URL.
  let dir = getFile(GAIA_DIR, directory, app_name);
  let metadataFile = dir.clone();
  metadataFile.append("metadata.json");
  if (metadataFile.exists()) {
    let metadata = getJSON(metadataFile);
    origin = metadata.origin.replace(/^\s+|\s+$/, '');
    manifestURL = metadata.manifestURL;
    if (manifestURL) {
      manifestURL = manifestURL.replace(/^\s+|\s+$/, '');
    } else if (origin.slice(-1) == "/") {
      manifestURL = origin + "manifest.webapp";
    } else {
      manifestURL = origin + "/manifest.webapp";
    }
  }

  let manifestFile = dir.clone();
  manifestFile.append("manifest.webapp");
  let manifest;
  try {
    manifest = getJSON(manifestFile);
  } catch (e) {
    manifestFile = dir.clone();
    manifestFile.append("update.webapp");
    dump('Looking for packaged app: ' + manifestFile.path + '\n');
    manifest = getJSON(manifestFile);
  }

  if (entry_point &&
      manifest.entry_points &&
      manifest.entry_points[entry_point]) {
    manifest = manifest.entry_points[entry_point];
  }
  let icon = bestMatchingIcon(PREFERRED_ICON_SIZE, manifest, origin);

  //TODO set localizedName once we know the default locale
  return {
    manifestURL: manifestURL,
    entry_point: entry_point,
    updateTime: INSTALL_TIME,
    name: manifest.name,
    icon: icon
  };
}

function getCustomize(name) {
  var content;
  if (Gaia.customizeFolder) {
    let customize = getFile(Gaia.customizeFolder, name + '.json');
    if (customize.exists()) {
      content = getJSON(customize);
    }
  }
  return content;
}

// zeroth grid page is the dock
let customize = {"homescreens": [
  [
    ["apps", "communications", "dialer"],
    ["apps", "sms"],
    ["apps", "communications", "contacts"],
    ["apps", "browser"]
  ], [
    ["apps", "camera"],
    ["apps", "gallery"],
    ["apps", "fm"],
    ["apps", "settings"],
    ["external-apps", "marketplace"]
  ], [
    ["apps", "calendar"],
    ["apps", "clock"],
    ["apps", "costcontrol"],
    ["apps", "email"],
    ["apps", "music"],
    ["apps", "video"]
  ]
]};

if (DOGFOOD == 1) {
  customize.homescreens[0].push(["dogfood_apps", "feedback"]);
}

let homescreens = getCustomize('homescreens');
if (homescreens) {
  customize = homescreens;
}

let content = {
  search_page: {
    provider: 'EverythingME',
    enabled: true
  },

  // It defines the threshold in pixels to consider a gesture like a tap event
  tap_threshold: 10,

  // This specifies whether we optimize homescreen panning by trying to
  // predict where the user's finger will be in the future.
  prediction: {
    enabled: true,
    lookahead: 16  // 60fps = 16ms per frame
  },

  grid: customize.homescreens.map(
    function map_homescreens(applist) {
      var output = [];
      for (var i = 0; i < applist.length; i++) {
        if (applist[i] !== null) {
          output.push(iconDescriptor.apply(null, applist[i]));
        }
      }
      return output;
    }
  )
};

let init = getFile(GAIA_DIR, GAIA_CORE_APP_SRCDIR, 'homescreen', 'js', 'init.json');
writeContent(init, JSON.stringify(content));

// Apps that should never appear in settings > app permissions
// bug 830659: We want homescreen to appear in order to remove e.me geolocation permission
let hidden_apps = [
  gaiaManifestURL('keyboard'),
  gaiaManifestURL('wallpaper'),
  gaiaManifestURL('bluetooth'),
  gaiaManifestURL('pdfjs')
];

init = getFile(GAIA_DIR, GAIA_CORE_APP_SRCDIR, 'settings', 'js', 'hiddenapps.js');
writeContent(init, "var HIDDEN_APPS = " + JSON.stringify(hidden_apps));

// Apps that should never appear as icons in the homescreen grid or dock
hidden_apps = hidden_apps.concat([
  gaiaManifestURL('homescreen'),
  gaiaManifestURL('system')
]);

init = getFile(GAIA_DIR, GAIA_CORE_APP_SRCDIR, 'homescreen', 'js', 'hiddenapps.js');
writeContent(init, "var HIDDEN_APPS = " + JSON.stringify(hidden_apps));

// Cost Control
init = getFile(GAIA_DIR, 'apps', 'costcontrol', 'js', 'config.json');

content = {
  provider: 'Vivo',
  enable_on: { 724: [6, 10, 11, 23] }, // { MCC: [ MNC1, MNC2, ...] }
  is_free: true,
  is_roaming_free: true,
  credit: { currency : 'R$' },
  balance: {
    destination: '8000',
    text: 'SALDO',
    senders: ['1515'],
    regexp: 'Saldo Recarga: R\\$\\s*([0-9]+)(?:[,\\.]([0-9]+))?'
  },
  topup: {
    destination: '7000',
    ussd_destination: '*321#',
    text: '&code',
    senders: ['1515', '7000'],
    confirmation_regexp: 'Voce recarregou R\\$\\s*([0-9]+)(?:[,\\.]([0-9]+))?',
    incorrect_code_regexp: '(Favor enviar|envie novamente|Verifique) o codigo de recarga'
  },
  default_low_limit_threshold: 3
};

let costcontrol = getCustomize('costcontrol');
if (costcontrol) {
  content = costcontrol;
}

writeContent(init, JSON.stringify(content));

// SMS
init = getFile(GAIA_DIR, 'apps', 'sms', 'js', 'blacklist.json');
content = ["1515", "7000"];

let blacklist = getCustomize('sms-blacklist');
if (blacklist) {
  content = blacklist;
}

writeContent(init, JSON.stringify(content));

// Browser
init = getFile(GAIA_DIR, 'apps', 'browser', 'js', 'init.json');

content = {
  "bookmarks": [
    { "title": "Vivo Busca",
      "uri": "http://www.google.com.br/m/search?client=ms-hms-tef-br",
      "iconUri": "data:image/png;base64,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"
    },
    { "title": "Serviços e Downloads",
      "uri": "http://vds.vivo.com.br",
      "iconUri": "data:image/png;base64,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"
    },
    {
      "title": "Site Vivo",
      "uri": "http://www.vivo.com.br/conteudosmartphone",
      "iconUri": "data:image/jpg;base64,/9j/4AAQSkZJRgABAQEAlgCWAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAAgACADASIAAhEBAxEB/8QAGgAAAgIDAAAAAAAAAAAAAAAABQYBAwQHCP/EAC4QAAEDAwIEBQIHAAAAAAAAAAECAwQFBhEAIQcSMUETFFFhcSKBMkKCkqGxwf/EABkBAAIDAQAAAAAAAAAAAAAAAAMGAAECBP/EACQRAAIBAwQCAgMAAAAAAAAAAAECEQMEEgAFITEiQVFxMmGh/9oADAMBAAIRAxEAPwDrG7rkg25AEiVlx1eQywk/U4f8A7nSXFrXEW4k+ZpMJiFEV+BxYSAfgqyT8gasmQBcPEQpmDnjNuFPIenI2OnwVf3ozOnSKnJ8rDeUhnPIyyyoJKwO59Btn2Gky53F7lncswQMVVVMFiOzPxpko0KVsiqEDORJLcgA9CPnQGbVOJdvtGXUIrE+IjdxTaUr5R6kJwoD3wQNN9lXVCuaEXGR4UlsAuMk52PRST3ToLBRNgywtp59pxDwbcaWvmC9wMehznY++sOi01qlcRZSYIDbHmikIT0AW0lah8cxOpZX9ak6sC2JYKysZImYIPB4jkau4pUbimwKgMBIKiAY7BHXvgjQldRXa/F+WmouLEOWQ6ypXQJUCDj9RP7dTSLHrsC6mpER1C6c49zpmMPAEtE53Gc5x6ZGn29LUpd1QEx56VNvNEqYkN7LaJ649QcDIOxwO4B0jxba4kW2S1RqjGqEXP0guBKvulY5QfcHJ0W82rB/KmXTLIY/kCYkR7BgaNbbgtWl4OEfEKQ3RA6IPo/erJ9PumJeTtRapbstIfUtsBWW1D8pOD22ODo9Zdt1RmsP1+vPDzTpJbjpVlKCeqj2zjYY6DQZUHilUh4cmQ1BQepEhKMfdsc3862HSWpLFMjMzHQ7IbbSlxYJIUoDc7763tW3UzcM5RwAchnAGR98cn9Trm3C7dKIQMhJGJxkmB/PvX//2Q=="
    }
  ]
}

let browser = getCustomize('browser');
if (browser) {
  content = browser;
}

writeContent(init, JSON.stringify(content));

// Support
init = getFile(GAIA_DIR, 'apps', 'settings', 'resources', 'support.json');
content = {
  "onlinesupport": {
    "href": "http://www.vivo.com.br/portalweb/appmanager/env/web?_nfls=false&_nfpb=true&_pageLabel=vcAtendMovelBook&WT.ac=portal.atendimento.movel",
    "title": "Vivo"
  },
  "callsupport": [
    {
      "href": "tel:*8486",
      "title": "*8486"
    },
    {
      "href": "tel:1058",
      "title": "1058"
    }
  ]
}

let support = getCustomize('support');
if (support) {
  content = support;
}

writeContent(init, JSON.stringify(content));

// ICC / STK
init = getFile(GAIA_DIR, 'apps', 'settings', 'resources', 'icc.json');
content = {
  "defaultURL": "http://www.mozilla.org/en-US/firefoxos/"
}

let icc = getCustomize('icc');
if (icc) {
  content = icc;
}

writeContent(init, JSON.stringify(content));
