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
  });

  suite('ActivityController()', function() {
    setup(function() {
      this.configure = sinon.stub(this.ActivityController.prototype, 'configure');
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
  });

  suite('ActivityController#configure()', function() {
    test('Should should configure pictureSize and ' +
      'recorderProfile options when reset', function() {
      this.controller = new this.ActivityController(this.app);

      var pictureSizes = this.app.settings.pictureSizes;
      var recorderProfiles = this.app.settings.recorderProfiles;

      assert.ok(pictureSizes.on.calledWith('optionsreset', this.controller.configurePictureSize));
      assert.ok(recorderProfiles.on.calledWith('optionsreset', this.controller.configureVideoSize));
    });
  });

  suite('ActivityController#bindEvents()', function() {
    test('Should reset the `settings.mode` with the ' +
      'modes defined by the activity', function() {
      this.app.activity.data.modes = ['video'];
      this.controller = new this.ActivityController(this.app);

      assert.ok(this.app.settings.mode.resetOptions.args[0][0].length === 1);
      assert.ok(this.app.settings.mode.resetOptions.args[0][0][0] === 'video');
      this.app.settings.mode.resetOptions.reset();

      this.app.activity.data.modes = ['video', 'picture'];
      this.controller = new this.ActivityController(this.app);

      assert.ok(this.app.settings.mode.resetOptions.args[0][0].length === 2);
      assert.ok(this.app.settings.mode.resetOptions.args[0][0][0] === 'video');
      assert.ok(this.app.settings.mode.resetOptions.args[0][0][1] === 'picture');
    });
  });

  suite('ActivityController#configurePictureSize()', function() {
    setup(function() {
      this.filteredOptions = [{}, {}, {}];
      this.pickedOption = { width: 1, height: 1 };

      this.app.lessThanBytes = sinon.stub().returns(this.filteredOptions);
      this.app.closestToSize = sinon.stub().returns(this.pickedOption);

      this.controller = new this.ActivityController(this.app);
    });

    test('Should filter `pictureSize` options by bytes if ' +
      'activity defines `maxFileSizeBytes`', function() {
      var options = [{}, {}, {}];
      this.app.activity.data.maxFileSizeBytes = 100;
      this.controller.configurePictureSize(options);

      assert.ok(this.app.lessThanBytes.calledWith(100, options));
      assert.ok(this.app.settings.pictureSizes.set.calledWith('options', this.filteredOptions));
    });

    test('Should not attempt to filter by options by ' +
      'width/height if `maxFileSizeBytes` is defined', function() {
      this.app.activity.data.maxFileSizeBytes = 100;
      this.controller.configurePictureSize([]);
      assert.ok(!this.app.closestToSize.called);
    });

    test('Should filter `pictureSize` options by size if ' +
      'activity defines `width` or `height`', function() {
      var options = ['a', 'b', 'c'];
      this.app.activity.data.width = 100;
      this.app.activity.data.height = 100;
      this.controller.configurePictureSize(options);

      var target = this.app.closestToSize.args[0][0];

      assert.ok(target.width === 100);
      assert.ok(target.height === 100);

      var pickedSize = this.app.settings.pictureSizes.set.args[0][1][0];
      assert.ok(pickedSize === this.pickedOption);
    });
  });




});
