'use strict';

var MovistarColombiaConfig = {
  provider: 'Movistar',
  is_free: true,
  is_roaming_free: true,
  credit: { currency: '$' },
  balance: {
    destination: '611',
    text: 'SALDO',
    senders: ['612'],
    regexp: 'Saldo Recarga: ([0-9,]+)\\.([0-9]{2}) \\$'
  },
  topup: {
    ussd_destination: '*611#'
  },
  default_low_limit_threshold: 2000
};

ConfigManager.setConfig(MovistarColombiaConfig);
