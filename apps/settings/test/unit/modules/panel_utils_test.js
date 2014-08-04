'use strict';

suite('PanelUtils', function() {
  var realL10n;
  var modules = [
    'unit/mock_l10n',
    'modules/panel_utils'
  ];

  var map = {
    '*': {
      'modules/settings_cache': 'unit/mock_settings_cache'
    }
  };

  suiteSetup(function(done) {
    testRequire(modules, map, (function(MockL10n, PanelUtils) {
      this.PanelUtils = PanelUtils;

      realL10n = window.navigator.mozL10n;
      window.navigator.mozL10n = MockL10n;
      done();
    }).bind(this));
  });

  suiteTeardown(function() {
    window.navigator.mozL10n = realL10n;
  });

  suite('activate', function() {
    suiteSetup(function() {
      this.realOpenLink = window.openLink;
      window.openLink = sinon.spy();
    });

    suiteTeardown(function() {
      window.openLink = this.realOpenLink;
    });

    setup(function() {
      this.targetElement = document.createElement('div');
      this.targetLink = document.createElement('a');
      this.targetElement.appendChild(this.targetLink);
    });

    teardown(function() {
      window.openLink.reset();
    });

    test('The navigated url should be the current url', function() {
      var originalLink = 'http://www.originallink/';
      var newLink = 'http://www.newlink/';

      this.targetLink.href = originalLink;
      this.PanelUtils.activate(this.targetElement);
      this.targetLink.href = newLink;
      this.targetLink.onclick();
      sinon.assert.calledWith(window.openLink, newLink);
    });
  });
});
