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
      makeURL('camera'),
      makeURL('gallery'),
      makeURL('fm'),
      makeURL('settings'),
      'https://marketplace.mozilla.org/telefonica/',
      'http://demo.maps.public.devbln.europe.nokia.com/repository/ffos_buildme_k_b/'
    ],
    [ // page 2
      makeURL('calendar'),
      makeURL('clock'),
      makeURL('costcontrol'),
      makeURL('email'),
      makeURL('music'),
      makeURL('video'),
      makeURL('calculator'),
      makeURL('pdfjs'),
      'https://marketplace-dev.allizom.org/telefonica/'
    ]
  ],
  dock: [
    makeURL('communications', 'dialer'),
    makeURL('sms'),
    makeURL('communications', 'contacts'),
    makeURL('browser'),
    makeURL('feedback')
  ]
}

writeContent(init, JSON.stringify(content));

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
