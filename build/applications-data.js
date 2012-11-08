'use strict';

function makeManifestURL(name) {
  return GAIA_SCHEME + name + '.' + GAIA_DOMAIN + (GAIA_PORT ? GAIA_PORT : '') +
         "/" + "manifest.webapp";
}

// Initial Homescreen icon descriptors.
// TODO: we could automatically generate this by reading the
// information from the manifest files.
let init = getFile(GAIA_DIR, 'build', 'homescreen-init.json');
let targetDir = getFile(GAIA_DIR, 'apps', 'homescreen', 'js');
init.copyTo(targetDir, 'init.json');

// Apps that should never appear as icons in the homescreen grid or dock.
let hidden_apps = [
  makeManifestURL('homescreen'),
  makeManifestURL('keyboard'),
  makeManifestURL('wallpaper'),
  makeManifestURL('bluetooth'),
  makeManifestURL('system'),
  makeManifestURL('pdfjs')
];
init = getFile(GAIA_DIR, 'apps', 'homescreen', 'js', 'hiddenapps.js');
writeContent(init, JSON.stringify(hidden_apps));

// Cost Control
init = getFile(GAIA_DIR, 'apps', 'costcontrol', 'js', 'config.json');

let content = {
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
