/* global ConfigManager */
'use strict';

var MovistarUruguayConfig = {
  provider: 'Movistar',
  is_free: true,
  is_roaming_free: true,
  credit: { currency: '$' },
  balance: {
    destination: '222',
    text: 'SALDO',
    senders: ['222'],
    regexp: 'Recarga \\$([0-9,]+)(?:\\.([0-9]+))?',
    zero_regexp: '(Su saldo actual es cero)',
    minimum_delay: 3 * 60 * 60 * 1000 // 3h
  },
  topup: {
    ussd_destination: '*222*1*1#'
  },
  default_low_limit_threshold: 0
};

ConfigManager.setConfig(MovistarUruguayConfig);
