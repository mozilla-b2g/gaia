'use strict';

suite('PanelUtils', function() {
  var modules = [
    'modules/panel_utils'
  ];

  var map = {
    '*': {
      'modules/settings_cache': 'unit/mock_settings_cache'
    }
  };

  suiteSetup(function(done) {
    testRequire(modules, map, (function(PanelUtils) {
      this.PanelUtils = PanelUtils;

      done();
    }).bind(this));
  });

  suite('activate', function() {
    setup(function() {
      this.targetElement = document.createElement('div');
      this.targetLink = document.createElement('a');
      this.targetElement.appendChild(this.targetLink);
      this.sinon.spy(this.targetLink, 'addEventListener');
    });

    test('The navigated url should be the current url', function() {
      var originalLink = 'http://www.originallink/';
      var newLink = 'http://www.newlink/';

      this.targetLink.href = originalLink;
      this.PanelUtils.activate(this.targetElement);
      this.targetLink.href = newLink;
      assert.ok(this.targetLink.addEventListener.calledWith('click'));
    });
  });
});
