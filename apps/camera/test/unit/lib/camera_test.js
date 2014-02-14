
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

  // setup(function() {
  //   navigator.getDeviceStorage = navigator.getDeviceStorage || function() {};
  //   sinon.stub(navigator, 'getDeviceStorage');
  //   if (!navigator.mozCameras) {
  //     navigator.mozCameras = {
  //       getListOfCameras: function() { return []; },
  //       getCamera: function() {},
  //       release: function() {}
  //     };
  //   }
  //   this.camera = new Camera({});
  // });

  // teardown(function() {
  //   navigator.getDeviceStorage.restore();
  // });

});
