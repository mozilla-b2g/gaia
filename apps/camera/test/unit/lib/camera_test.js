suite('camera', function() {
  'use strict';

  var require = window.req;
  var Camera;

  suiteSetup(function(done) {
    require(['lib/camera'], function(_camera) {
      Camera = _camera;
      done();
    });
  });

  setup(function() {
    navigator.getDeviceStorage = navigator.getDeviceStorage || function() {};
    this.sandbox = sinon.sandbox.create();
    this.sandbox.stub(navigator, 'getDeviceStorage');
     navigator.mozCameras = {
      getListOfCameras: function() { return []; },
      getCamera: function() {
        var mycamera = function() {};
        return mycamera;
      }
     };
  });

  teardown(function() {
    this.sandbox.restore();
  });

  suite('Camera#setTouchFocus', function() {
    setup(function() {
      this.camera = new Camera({});
      //this.camera.load();
      this.sandbox.stub(this.camera.mozCamera,'autoFocus');
      this.camera.mozCamera.autoFocus.callsArgWith(0,true);
    });

    teardown(function() {
      this.camera.setAutoFocus.restore();
    });

    test('set auto focus', function(done) {
      var x = 2;
      var y = 3;
      this.camera.setTouchFocus(x,y,function(){done()});
      assert.isTrue(this.camera.mozCamera.autoFocus.called);
    });
  });
});

