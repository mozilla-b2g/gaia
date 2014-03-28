suite('controllers/activity', function() {
  /*jshint maxlen:false*/
  /*global req*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    req([
      'controllers/activity',
      'lib/setting',
    ], function(ActivityController, Setting) {
      self.ActivityController = ActivityController.ActivityController;
      self.Setting = Setting;
      done();
    });
  });

  setup(function() {
    this.app = {
      activity: {
        active: true,
        data: {}
      },
      on: sinon.spy(),
      settings: {
        mode: sinon.createStubInstance(this.Setting),
        pictureSizes: sinon.createStubInstance(this.Setting),
        recorderProfiles: sinon.createStubInstance(this.Setting)
      }
    };

    // Aliases
    this.settings = this.app.settings;
    this.activity = this.app.activity;

    this.controller = new this.ActivityController(this.app);
  });

  suite('ConfirmController()', function() {
    setup(function() {
      this.configure = sinon.spy(this.ActivityController.prototype, 'configure');
    });

    teardown(function() {
      this.configure.restore();
    });

    test('Should *not* configure if activity is not active', function() {
      this.app.activity.active = false;
      this.controller = new this.ActivityController(this.app);
      assert.ok(this.controller.configure.called === false);
    });

    test('Should configure if activity is active', function() {
      this.controller = new this.ActivityController(this.app);
      assert.ok(this.configure.called);
    });

    test('Should reset the `settings.mode` with the modes defined by the activity', function() {
      this.app.activity.data.modes = ['video'];
      this.app.settings.mode.filterOptions.reset();
      this.controller = new this.ActivityController(this.app);

      assert.ok(this.app.settings.mode.filterOptions.args[0][0].length === 1);
      assert.ok(this.app.settings.mode.filterOptions.args[0][0][0] === 'video');
      this.app.settings.mode.filterOptions.reset();

      this.app.activity.data.modes = ['video', 'picture'];
      this.controller = new this.ActivityController(this.app);

      assert.ok(this.app.settings.mode.filterOptions.args[0][0].length === 2);
      assert.ok(this.app.settings.mode.filterOptions.args[0][0][0] === 'video');
      assert.ok(this.app.settings.mode.filterOptions.args[0][0][1] === 'picture');
    });

    test('Should should configure pictureSize and recorderProfile options when reset', function() {
      var pictureSizes = this.app.settings.pictureSizes;
      var recorderProfiles = this.app.settings.recorderProfiles;
      var callback;

      callback = pictureSizes.on.args[0][1];
      assert.ok(pictureSizes.on.calledWith('configured'));
      assert.equal(typeof callback, 'function');

      callback = recorderProfiles.on.args[0][1];
      assert.ok(recorderProfiles.on.calledWith('configured'));
      assert.equal(typeof callback, 'function');
    });
  });

  suite('ConfirmController#filterPictureSize()', function() {
    setup(function() {
      this.sizes = [{
        "key": "2048x1536",
        "title": "3MP 2048x1536 4:3",
        "pixelSize": 3145728,
        "data": {
          "height": 1536,
          "width": 2048,
          "aspect": "4:3",
          "mp": 3
        },
        "index": 0
      }, {
        "key": "800x600",
        "title": "800x600 4:3",
        "pixelSize": 480000,
        "data": {
          "height": 600,
          "width": 800,
          "aspect": "4:3",
          "mp": 0
        },
        "index": 5
      }, {
        "key": "800x480",
        "title": "800x480 5:3",
        "pixelSize": 384000,
        "data": {
          "height": 480,
          "width": 800,
          "aspect": "5:3",
          "mp": 0
        },
        "index": 6
      }, {
        "key": "640x480",
        "title": "640x480 4:3",
        "pixelSize": 307200,
        "data": {
          "height": 480,
          "width": 640,
          "aspect": "4:3",
          "mp": 0
        },
        "index": 7
      }, {
        "key": "320x240",
        "title": "320x240 4:3",
        "pixelSize": 76800,
        "data": {
          "height": 240,
          "width": 320,
          "aspect": "4:3",
          "mp": 0
        },
        "index": 9
      }];

      this.app.settings.pictureSizes.get
        .withArgs('options')
        .returns(this.sizes);
    });

    test('Should filter by file-size if `maxFileSizeBytes` defined', function() {
      this.app.activity.data.maxFileSizeBytes = 460800;
      this.controller.filterPictureSize();
      var args = this.settings.pictureSizes.filterOptions.args[0][0];
      assert.equal(args.length, 4);
    });

    test('Should filter by width/height if defined', function() {
      var arg;

      this.app.activity.data.width = 640;
      this.app.activity.data.height = 480;

      this.controller.filterPictureSize();
      arg = this.settings.pictureSizes.filterOptions.args[0][0];
      assert.equal(arg[0], '640x480');

      this.app.activity.data.width = 400;
      this.app.activity.data.height = 300;

      this.controller.filterPictureSize();
      arg = this.settings.pictureSizes.filterOptions.args[0][0];
      assert.equal(arg[0], '640x480');
    });
  });

 suite('ConfirmController#filterRecorderProfiles()', function() {
  setup(function() {
    this.profiles = [
      { key: 'high' },
      { key: 'medium' },
      { key: 'low' }
    ];

    this.app.settings.recorderProfiles.get
      .withArgs('options')
      .returns(this.profiles);
  });

  test('Should not filter if `maxFileSizeBytes` is not defined', function() {
    this.controller.filterRecorderProfiles();
    assert.isFalse(this.settings.recorderProfiles.filterOptions.called);
  });

  test('Should pick the lowest (last) profile if `maxFileSizeBytes` is specified', function() {
    var filterOptions = this.settings.recorderProfiles.filterOptions;

    this.activity.data.maxFileSizeBytes = 99999;
    this.controller.filterRecorderProfiles();

    assert.isTrue(filterOptions.called);
    assert.equal(filterOptions.args[0][0][0], 'low');
  });
 });
});
