'use strict';

suite('Sound > VolumeManager', function() {
  var volumeManager;
  var dom = document.createElement('li');

  var modules = [
    'panels/sound/volume_manager'
  ];

  var maps = {
    '*': {
      'panels/sound/slider_handler': 'MockSliderHandler'
    }
  };

  setup(function(done) {
    var that = this;
    // Define MockSliderHandler
    this.MockSliderHandler = {
      init: function(element, type) {}
    };
    define('MockSliderHandler', function() {
      return function() {
        return that.MockSliderHandler;
      };
    });

    testRequire(modules, maps, function(module) {
      volumeManager = module();
      done();
    });
  });

  suite('initiation', function() {
    setup(function() {
      this.sinon.spy(this.MockSliderHandler, 'init');
    });

    test('we would call _sliderHandler for each item',
      function() {
        var element = {
          media: dom,
          notification: dom,
          alarm: dom
        };
        volumeManager.init(element);
        assert.ok(this.MockSliderHandler.init.calledThrice);
        assert.ok(this.MockSliderHandler.init.calledWith(
          volumeManager._elements.media, 'content'));
        assert.ok(this.MockSliderHandler.init.calledWith(
          volumeManager._elements.notification, 'notification'));
        assert.ok(this.MockSliderHandler.init.calledWith(
          volumeManager._elements.alarm, 'alarm'));
    });
  });
});
