/* global ConfigManager */
'use strict';

var MovistarPeruConfig = {
  provider: 'Movistar',
  is_free: false,
  credit: { currency: 'S/.' },
  balance: {
    destination: '600',
    text: 'S',
    senders: ['515'],
    regexp: '([0-9,]+)\\.([0-9]{2})',
    zero_regexp: '(Usted no tiene saldo en sus cuentas)',
    minimum_delay: 3 * 60 * 60 * 1000 // 3h
  },
  default_low_limit_threshold: 1
};

ConfigManager.setConfig(MovistarPeruConfig);
