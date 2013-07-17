// Test config. mail_app.js has the non-test, runtime config
requirejs.config({
  baseUrl: TestUrlResolver.resolve('email/js'),
  paths: {
    l10nbase: '../shared/js/l10n',
    l10ndate: '../shared/js/l10n_date',
    style: '../style',
    shared: '../shared',

    'mailapi/main-frame-setup': 'ext/mailapi/main-frame-setup',
    'mailapi/main-frame-backend': 'ext/mailapi/main-frame-backend'
  },
  map: {
    '*': {
      'api': 'mailapi/main-frame-setup'
    }
  },
  shim: {
    l10ndate: ['l10nbase']
  }
});
