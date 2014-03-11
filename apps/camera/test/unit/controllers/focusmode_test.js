suite('controllers/focusmode', function() {
 'use strict';

  suiteSetup(function(done) {
    var self = this;
    req([
      'app',
      'lib/camera',
      'lib/settings',
      'lib/setting',
      'controllers/focusmode'
    ], function(App, Camera, Settings,
                Setting, focusmodeController) {
      self.Camera = Camera;
      self.App = App;
      self.FocusmodeController = focusmodeController.focusmodeController;
      self.Settings = Settings;
      self.Setting = Setting;
      done();
    });
  });

  setup(function() {
    this.app = sinon.createStubInstance(this.App);
    this.app.camera = sinon.createStubInstance(this.Camera);
    this.app.settings = sinon.createStubInstance(this.Settings);
    this.app.settings.cameras = sinon.createStubInstance(this.Setting);
    this.app.settings.mode = sinon.createStubInstance(this.Setting);
    this.app.settings.mode.is
      .withArgs('options')
      .returns(true);

    // For convenience
    this.camera = this.app.camera;
    this.focusmodeController = new this.FocusmodeController(this.app);
  });

  suite('FocusmodeController()', function() {
   test('Should listen to the following events', function() {
     assert.ok(this.camera.on.calledWith('configured'));
   });

   test('Should set the default focus to Face tracking mode during front camera', function() {
     this.app.settings.cameras = {
       selected: function() {
         return 'front';
       }
     };
     this.focusmodeController.setDefaultFocusMode();
     assert.ok(this.app.settings.mode.is.calledWith('picture'));
     assert.ok(!this.camera.setContinuousAutoFocus.called);
     assert.ok(!this.camera.enableAutoFocusMove.called);
   });

   test('Should set default focus mode to continuous Auto when camera is undefined', function() {
    this.focusmodeController.setDefaultFocusMode();

    assert.ok(this.app.settings.mode.is.calledWith('picture'));
    assert.ok(this.camera.setContinuousAutoFocus.called);
    assert.ok(this.camera.enableAutoFocusMove.called);
   });
  });
});