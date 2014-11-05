suite('controllers/activity', function() {
  /*jshint maxlen:false*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'app',
      'controllers/activity',
      'lib/setting',
    ], function(App, ActivityController, Setting) {
      self.ActivityController = ActivityController.ActivityController;
      self.Setting = Setting;
      self.App = App;
      done();
    });
  });

  setup(function() {
    this.sandbox = sinon.sandbox.create();

    this.app = sinon.createStubInstance(this.App);
    this.app.win = { location: {} };
    this.app.activity = {};
    this.app.settings = {
      mode: sinon.createStubInstance(this.Setting),
      pictureSizes: sinon.createStubInstance(this.Setting),
      recorderProfiles: sinon.createStubInstance(this.Setting),
      activity: sinon.createStubInstance(this.Setting)
    };

    // Stub `mozSetMessageHandler`
    navigator.mozSetMessageHandler = navigator.mozSetMessageHandler || function() {};
    this.sandbox.stub(navigator, 'mozSetMessageHandler');

    // Aliases
    this.settings = this.app.settings;
    this.activity = this.app.activity;

    this.controller = new this.ActivityController(this.app);
  });

  teardown(function() {
    this.sandbox.restore();
  });

  suite('ActivityController#configure()', function() {
    test('Should should store the activity type on `app.activity`', function() {
      this.controller.getName = sinon.stub().returns('pick');
      this.controller.configure();
      assert.equal(this.app.activity.pick, true);
    });
  });

  suite('ActivityController#bindEvents()', function() {
    setup(function() {
      sinon.spy(this.controller, 'setupListener');
    });

    test('It binds a listener straight away if an activity name was found', function() {
      this.controller.name = 'pick';
      this.controller.bindEvents();
      sinon.assert.calledWith(navigator.mozSetMessageHandler, 'activity');
    });

    test('It binds a listener straight after critical path if no activity name was found', function() {
      this.controller.name = undefined;
      this.controller.bindEvents();
      sinon.assert.calledWith(this.app.once, 'criticalpathdone');

      // Call the callback
      this.app.once.withArgs('criticalpathdone').args[0][1]();
      sinon.assert.calledWith(navigator.mozSetMessageHandler, 'activity');
    });
  });

  suite('ActivityController#getName()', function() {
    test('It returns the name after the #', function() {
      this.app.win.location.hash = '#pick';
      var name = this.controller.getName();
      assert.equal(name, 'pick');
    });

    test('It returns undefined if no hash fragment is present', function() {
      this.app.win.location.hash = '';
      var name = this.controller.getName();
      assert.equal(name, undefined);
    });
  });

  suite('Activity#confgureMode()', function() {
    test('Should get \'picture\' and \'video\' modes for SMS \'pick\' activity', function() {
      var activity = {
        'source': {
          'data': {
            'type': ['image/*', 'audio/*', 'video/*'],
            'maxFileSizeBytes': 307200
          },
          'name': 'pick'
        }
      };

      this.controller.configureMode(activity);
      var modes = this.settings.mode.filterOptions.args[0][0];
      assert.deepEqual(modes, ['picture', 'audio', 'video']);
    });

    test('Should get \'picture\' and \'video\' modes input[type="file"] \'pick\' activity', function() {
      var activity = {
        'source': {
          'data': {
            'type': [],
            'nocrop': true
          },
          'name': 'pick'
        }
      };

      this.controller.configureMode(activity);
      var modes = this.settings.mode.filterOptions.args[0][0];
      assert.deepEqual(modes, ['picture', 'video']);
    });

    test('Should get \'picture\' mode for input[type="file"] \'pick\' activity', function() {
      var activity = {
        'source': {
          'data': {
            'type': ['image/gif', 'image/jpeg', 'image/pjpeg',
                     'image/png', 'image/svg+xml', 'image/tiff',
                     'image/vnd.microsoft.icon'],
            'nocrop': true
          },
          'name': 'pick'
        }
      };

      this.controller.configureMode(activity);
      var modes = this.settings.mode.filterOptions.args[0][0];
      assert.deepEqual(modes, ['picture']);
    });

    test('Should be able to cope with String as well as Array', function() {
      var activity = {
        source: {
          data: { type: 'image/jpeg' },
          name: 'pick'
        }
      };

      this.controller.configureMode(activity);
      var modes = this.settings.mode.filterOptions.args[0][0];
      assert.deepEqual(modes, ['picture']);
    });

    test('Should get [\'picture\', \'video\'] modes for Lockscreen/Gallery \'record\' activity', function() {
      var activity = {
        source: {
          data: { type: 'photos' },
          name: 'record'
        }
      };

      this.controller.configureMode(activity);
      var modes = this.settings.mode.filterOptions.args[0][0];
      assert.deepEqual(modes, ['picture', 'video']);
    });

    test('Should get [\'video\', \'picture\'] modes for ' +
      'Video \'record\' activity', function() {
      var activity = {
        source: {
          data: { type: 'videos' },
          name: 'record'
        }
      };

      this.controller.configureMode(activity);
      var modes = this.settings.mode.filterOptions.args[0][0];
      assert.deepEqual(modes, ['video', 'picture']);
    });
  });

  suite('ActivityController#onMessage()', function() {
    setup(function() {
      this.activity = {
        source: {
          name: 'pick',
          data: {
            type: 'image/jpeg',
            maxFileSizeBytes: 100
          },
        }
      };

      sinon.spy(this.controller, 'configureMode');
      sinon.stub(this.controller, 'getMaxPixelSize').returns('<max-pixel-size>');
      this.controller.onMessage(this.activity);
    });

    test('Should emit app events', function() {
      sinon.assert.calledWith(this.app.emit, 'activity');
      sinon.assert.calledWith(this.app.emit, 'activity:pick');
    });

    test('Should configure mode', function() {
      sinon.assert.called(this.controller.configureMode);
    });

    test('Should keep a reference to the activity', function() {
      assert.equal(this.controller.activity, this.activity);
    });

    test('Should pass `data.maxFileSizeBytes`', function() {
      var data = this.app.emit.withArgs('activity:pick').args[0][1];
      assert.equal(data.maxFileSizeBytes, 100);
    });

    test('Should pass `data.name`', function() {
      var data = this.app.emit.withArgs('activity:pick').args[0][1];
      assert.equal(data.name, 'pick');
    });

    test('Should pass `data.maxPixelSize`', function() {
      var data = this.app.emit.withArgs('activity:pick').args[0][1];
      assert.equal(data.maxPixelSize, '<max-pixel-size>');
    });

    test('Should not do anything if name is unrecognised', function() {
      this.app.emit.reset();

      this.activity.source.name = 'unknown';
      this.controller.onMessage(this.activity);

      assert.isFalse(this.app.emit.calledWith('activity'));
      assert.isFalse(this.app.emit.calledWith('activity:unknown'));
    });
  });

  suite('ActivityController#getMaxPixelSize()', function() {
    setup(function() {

      this.activity = {
        source: {
          name: 'pick',
          data: {
            type: 'image/jpeg',
            maxFileSizeBytes: 100,
            width: 100,
            height: 100
          },
        }
      };

      this.settings.activity.get
        .withArgs('maxPickPixelSize')
        .returns(480000);

      this.settings.activity.get
        .withArgs('maxPixelSizeScaleFactor')
        .returns(2.5);
    });

    test('Should return pixel estimate of maxFileSizeBytes if supplied', function() {
      var result = this.controller.getMaxPixelSize(this.activity);
      assert.equal(result, 267);
    });

    test('Should return a pixel estimate based on width height if supplied', function() {
      delete this.activity.source.data.maxFileSizeBytes;
      var result = this.controller.getMaxPixelSize(this.activity);
      assert.equal(result, 25000);
    });

    test('Should return `maxPickPixelSize` if neither supplied', function() {
      delete this.activity.source.data.maxFileSizeBytes;
      delete this.activity.source.data.width;
      delete this.activity.source.data.height;

      var result = this.controller.getMaxPixelSize(this.activity);
      assert.equal(result, this.settings.activity.get('maxPickPixelSize'));
    });

    test('Should be able to cope with only one dimension being specified', function() {
      delete this.activity.source.data.maxFileSizeBytes;
      delete this.activity.source.data.height;
      var result = this.controller.getMaxPixelSize(this.activity);
      assert.equal(result, (1/3 * 100000));

      delete this.activity.source.data.width;
      this.activity.source.data.height = 100;
      result = this.controller.getMaxPixelSize(this.activity);
      assert.equal(result, (1/3 * 100000));
    });
  });
});
