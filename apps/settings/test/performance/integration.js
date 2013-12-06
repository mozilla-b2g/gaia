var App = requireGaia('/tests/performance/app.js');

function SettingsIntegration(client) {
  App.apply(this, arguments);
}

SettingsIntegration.prototype = {
  __proto__: App.prototype,
  appName: 'Settings',
  manifestURL: 'app://settings.gaiamobile.org/manifest.webapp',

  selectors: {
    wifiSelector: '#menuItem-wifi'
  }
};

module.exports = SettingsIntegration;
