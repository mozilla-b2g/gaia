'use strict';

var VivoConfig = {
  provider: 'Vivo',
  is_free: true,
  is_roaming_free: true,
  credit: { currency: 'R$' },
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
    confirmation_regexp:
      'Voce recarregou R\\$\\s*([0-9]+)(?:[,\\.]([0-9]+))?',
    incorrect_code_regexp:
      '(Favor enviar|envie novamente|Verifique) o codigo de recarga'
  },
  default_low_limit_threshold: 3
};

ConfigManager.setConfig(VivoConfig);
