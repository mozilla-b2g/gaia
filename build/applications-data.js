'use strict';

const PREFERRED_ICON_SIZE = 64;
const GAIA_CORE_APP_SRCDIR = 'apps';
const GAIA_EXTERNAL_APP_SRCDIR = 'external-apps';

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
  // 'origin' file that specifies the URL.
  let dir = getFile(GAIA_DIR, directory, app_name);
  let originFile = dir.clone();
  originFile.append("origin");
  if (originFile.exists()) {
    origin = getFileContent(originFile).replace(/^\s+|\s+$/, '');
    if (origin.slice(-1) == "/") {
      manifestURL = origin + "manifest.webapp";
    } else {
      manifestURL = origin + "/manifest.webapp";
    }
  }

  let manifestFile = dir.clone();
  manifestFile.append("manifest.webapp");
  let manifest = getJSON(manifestFile);

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
    name: manifest.name,
    icon: icon
  };
}

let content = [
  // zeroth grid page is the dock
  [
    iconDescriptor(GAIA_CORE_APP_SRCDIR, 'communications', 'dialer'),
    iconDescriptor(GAIA_CORE_APP_SRCDIR, 'sms'),
    iconDescriptor(GAIA_CORE_APP_SRCDIR, 'communications', 'contacts'),
    iconDescriptor(GAIA_CORE_APP_SRCDIR, 'browser'),
    iconDescriptor(GAIA_CORE_APP_SRCDIR, 'feedback')
  ], [
    iconDescriptor(GAIA_CORE_APP_SRCDIR, 'camera'),
    iconDescriptor(GAIA_CORE_APP_SRCDIR, 'gallery'),
    iconDescriptor(GAIA_CORE_APP_SRCDIR, 'fm'),
    iconDescriptor(GAIA_CORE_APP_SRCDIR, 'settings'),
    iconDescriptor(GAIA_EXTERNAL_APP_SRCDIR, 'marketplace'),
    iconDescriptor(GAIA_EXTERNAL_APP_SRCDIR, 'maps')
  ], [
    iconDescriptor(GAIA_CORE_APP_SRCDIR, 'calendar'),
    iconDescriptor(GAIA_CORE_APP_SRCDIR, 'clock'),
    iconDescriptor(GAIA_CORE_APP_SRCDIR, 'costcontrol'),
    iconDescriptor(GAIA_CORE_APP_SRCDIR, 'email'),
    iconDescriptor(GAIA_CORE_APP_SRCDIR, 'music'),
    iconDescriptor(GAIA_CORE_APP_SRCDIR, 'video'),
    iconDescriptor(GAIA_CORE_APP_SRCDIR, 'calculator'),
    iconDescriptor(GAIA_EXTERNAL_APP_SRCDIR, 'marketplace-dev')
  ]
];

let init = getFile(GAIA_DIR, GAIA_CORE_APP_SRCDIR, 'homescreen', 'js', 'init.json');
writeContent(init, JSON.stringify(content));

// Apps that should never appear as icons in the homescreen grid or dock.
let hidden_apps = [
  gaiaManifestURL('homescreen'),
  gaiaManifestURL('keyboard'),
  gaiaManifestURL('wallpaper'),
  gaiaManifestURL('bluetooth'),
  gaiaManifestURL('system'),
  gaiaManifestURL('pdfjs')
];
init = getFile(GAIA_DIR, GAIA_CORE_APP_SRCDIR, 'homescreen', 'js', 'hiddenapps.js');
writeContent(init, "var HIDDEN_APPS = " + JSON.stringify(hidden_apps));

// Cost Control
init = getFile(GAIA_DIR, 'apps', 'costcontrol', 'js', 'config.json');

content = {
  enableon: { 724: [6, 10, 11, 23] }, // { MCC: [ MNC1, MNC2, ...] }
  credit: { currency : 'R$' },
  balance: { 
    destination: '8000',
    text: 'SALDO',
    senders: ['1515'],
    regexp: 'R\\$\\s*([0-9]+)(?:[,\\.]([0-9]+))?'
  },
  topup: {
    destination: '7000',
    ussd_destination: '*321#',
    text: '&code',
    senders: ['1515', '7000'],
    confirmation_regexp: 'Voce recarregou R\\$\\s*([0-9]+)(?:[,\\.]([0-9]+))?',
    incorrect_code_regexp: '(Favor enviar|envie novamente|Verifique) o codigo de recarga'
  }
};

writeContent(init, JSON.stringify(content));

// SMS
init = getFile(GAIA_DIR, 'apps', 'sms', 'js', 'blacklist.json');
content = ["1515"];
writeContent(init, JSON.stringify(content));
