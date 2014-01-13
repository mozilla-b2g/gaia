var App = requireGaia('/tests/performance/app.js');

function DialerIntegration(client) {
  App.apply(this, arguments);
}

DialerIntegration.prototype = {
  __proto__: App.prototype,
  appName: 'Phone',
  manifestURL: 'app://communications.gaiamobile.org/manifest.webapp',
  entryPoint: 'dialer',

  selectors: {
    optionRecents: '#option-recents'
  }
};

module.exports = DialerIntegration;
