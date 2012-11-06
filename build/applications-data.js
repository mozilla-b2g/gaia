'use strict';

// Initial Homescreen icon descriptors.
// TODO: we could automatically generate this by reading the
// information from the manifest files.
let init = getFile(GAIA_DIR, 'build', 'homescreen-init.json');
let targetDir = getFile(GAIA_DIR, 'apps', 'homescreen', 'js');
init.copyTo(targetDir, 'init.json');

init = getFile(GAIA_DIR, 'build', 'homescreen-hiddenapps.js');
targetDir = getFile(GAIA_DIR, 'apps', 'homescreen', 'js');
init.copyTo(targetDir, 'hiddenapps.js');

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
