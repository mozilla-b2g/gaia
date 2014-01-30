/* global ConfigManager */
'use strict';

var MovistarColombiaConfig = {
  provider: 'Movistar',
  is_free: false,
  is_roaming_free: false,
  credit: { currency: '$' },
  balance: {
    destination: '611',
    text: 'SALDO,A',
    senders: ['612', '611'],
    regexp: 'Saldo total:\\$([0-9,]+)\\.([0-9]{2})',
    minimum_delay: 3 * 60 * 60 * 1000 // 3h
  },
  topup: {
    ussd_destination: '*611#'
  },
  default_low_limit_threshold: 2000
};

ConfigManager.setConfig(MovistarColombiaConfig);
