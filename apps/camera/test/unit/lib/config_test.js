suite.only('Sounds', function() {
  /*jshint maxlen:false*/
  /*global req*/
  'use strict';

  /**
   * Locals
   */

  var has = {}.hasOwnProperty;

  var Sounds;
  var list = [
    {
      name: 'camera',
      setting: 'camera.shutter.enabled',
      url: 'resources/sounds/shutter.opus'
    },
    {
      name: 'recordingStart',
      url: 'resources/sounds/camcorder_start.opus',
      setting: 'camera.recordingsound.enabled'
    },
    {
      name: 'recordingEnd',
      url: 'resources/sounds/camcorder_end.opus',
      setting: 'camera.recordingsound.enabled'
    }
  ];

  suiteSetup(function(done) {
    var self = this;
    req(['lib/config'], function(Config) {
      self.Config = Config;
      done();
    });
  });

  setup(function() {
    this.config = new this.Config({
      maxResolution: 999,
      timer: {
        title: 'Self Timer',
        options: ['off', '3', '5', '10'],
        'default': 'off',
        type: 'toggle',
        menu: 3,
        persist: false
      },

      hdr: {
        title: 'HDR',
        options: ['off', 'on'],
        'default': 'off',
        type: 'toggle',
        persist: true,
        menu: 1
      },

      scene: {
        title: 'Scene Mode',
        options: ['normal', 'pano', 'beauty'],
        'default': 'normal',
        type: 'toggle',
        persist: true,
        menu: 2
      },

      mode: {
        title: 'Mode',
        options: ['photo', 'video'],
        'default': 'photo',
        persist: true
      },
    });
  });

  suite('Config#get()', function() {
    test('Should return the key from the config', function() {
      var hdr = this.config.get('hdr');
      assert.ok(hdr.title === 'HDR');
    });

    test('Should return undefined for undefined keys', function() {
      var diego = this.config.get('diego');
      assert.ok(diego === undefined);
    });
  });

  suite('Config#menu()', function() {
    test('Should return an array of just the items with a `menu` key', function() {
      var items = this.config.menu();
      var keys = items.map(function(item) { return item.key; });

      assert.ok(!~keys.indexOf('maxResolution'));
      assert.ok(!~keys.indexOf('mode'));
      assert.ok(~keys.indexOf('timer'));
      assert.ok(~keys.indexOf('hdr'));
      assert.ok(~keys.indexOf('scene'));
    });

    test('Should sort the items by given `menu` index', function() {
      var items = this.config.menu();

      assert.ok(items[0].key === 'hdr');
      assert.ok(items[1].key === 'scene');
      assert.ok(items[2].key === 'timer');
    });
  });

  suite('Config#values()', function() {
    test('Should return default values derived from each item', function() {
      var items = this.config.values();

      assert.ok(items.maxResolution === 999);
      assert.ok(items.timer === 'off');
      assert.ok(items.hdr === 'off');
      assert.ok(items.scene === 'normal');
      assert.ok(items.mode === 'photo');
    });
  });

  suite('Config#options()', function() {
    test('Should the options list for the given key', function() {
      var scene = this.config.options('scene');
      var hdr = this.config.options('hdr');

      assert.deepEqual(hdr, ['off', 'on']);
      assert.deepEqual(scene, ['normal', 'pano', 'beauty']);
    });

    test('Should return undefined if item has no options', function() {
      var scene = this.config.options('maxResolution');
      assert.ok(scene === undefined);
    });
  });

  suite('Config#persistent()', function() {
    test('Should return a list of config keys ' +
      'not marked `persist: false`', function() {
      var keys = this.config.persistent();

      assert.ok(!~keys.indexOf('maxResolution'));
      assert.ok(!~keys.indexOf('timer'));
      assert.ok(~keys.indexOf('mode'));
      assert.ok(~keys.indexOf('hdr'));
      assert.ok(~keys.indexOf('scene'));
    });
  });
});
