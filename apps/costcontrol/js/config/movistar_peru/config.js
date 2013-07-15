'use strict';

var MovistarPeruConfig = {
  provider: 'Movistar',
  is_free: true,
  credit: { currency: 'S/.' },
  balance: {
    destination: '600',
    text: 'S',
    senders: ['515'],
    regexp: '([0-9,]+)\\.([0-9]{2})'
  },
  default_low_limit_threshold: 1
};

ConfigManager.setConfig(MovistarPeruConfig);
