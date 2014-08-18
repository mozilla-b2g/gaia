'use strict';

suite('FramePanel', function() {
  var panelDOM;
  var framePanel;
  var mockSettingsPanel;
  var mockSettingsService;
  var appOptions = {
    mozapp: 'fakeApp',
    src: 'fakeAppSrc'
  };

  var modules = [
    'panels/frame/panel',
    'modules/settings_panel',
    'modules/settings_service'
  ];

  var map = {
    '*': {
      'modules/settings_panel': 'unit/mock_settings_panel',
      'modules/settings_service': 'unit/mock_settings_service'
    }
  };

  suiteSetup(function(done) {
    testRequire(modules, map, function(FramePanel, MockSettingsPanel,
      MockSettingsService) {
        mockSettingsPanel = MockSettingsPanel;
        mockSettingsPanel.mInnerFunction = function(options) {
          return {
            init: options.onInit,
            beforeShow: options.onBeforeShow,
            beforeHide: options.onBeforeHide,
            hide: options.onHide,
            _onBrowserClose: options._onBrowserClose
          };
        };

        mockSettingsService = MockSettingsService;
        framePanel = FramePanel();
        done();
    });
  });

  setup(function() {
    panelDOM = document.createElement('div');
    document.body.appendChild(panelDOM);
  });

  teardown(function() {
    document.body.removeChild(panelDOM);
  });

  suite('when calling onBeforeShow', function() {
    setup(function() {
      framePanel.beforeShow(panelDOM, appOptions);
    });

    test('would create an iframe with related attributes', function() {
      var frameDOM = panelDOM.querySelector('iframe');
      assert.equal(appOptions.mozapp, frameDOM.getAttribute('mozapp'));
      assert.equal(appOptions.src, frameDOM.getAttribute('src'));
      assert.equal('true', frameDOM.getAttribute('mozbrowser'));
    });
  });

  suite('handle mozbrowsershowmodalprompt events', function() {
    setup(function() {
      this.sinon.stub(window, 'alert');
      this.sinon.stub(window, 'prompt');
      this.sinon.stub(window, 'confirm');
      framePanel.beforeShow(panelDOM, appOptions);
    });

    ['alert', 'prompt', 'confirm'].forEach(function(eventName) {
      test('would handle ' + eventName + ' events', function() {
        var frameDOM = panelDOM.querySelector('iframe');
        frameDOM.dispatchEvent(new CustomEvent('mozbrowsershowmodalprompt', {
          detail: {
            promptType: eventName
          }
        }));
        assert.isTrue(window[eventName].called);
      });
    });
  });

  suite('handle mozbrowserclose event', function() {
    setup(function() {
      this.sinon.spy(mockSettingsService, 'back');
      framePanel.beforeShow(panelDOM, appOptions);
    });

    test('would close when app called window.close()', function() {
      var frameDOM = panelDOM.querySelector('iframe');
      frameDOM.dispatchEvent(new CustomEvent('mozbrowserclose'));
      assert.isTrue(mockSettingsService.back.called);
    });
  });
});
