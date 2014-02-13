suite('lib/config', function() {
  /*global req*/
  'use strict';

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

      flashModes: {
        title: 'Flash',
        options: [
          {
            value: 'auto',
            title: 'Auto',
            icon: 'A'
          },
          {
            value: 'on',
            title: 'On',
            icon: 'O'
          },
          {
            value: 'off',
            title: 'Off',
            icon: 'O'
          }
        ],
        selected: 0,
        persistent: true
      },

      timer: {
        title: 'Self Timer',
        options: [
          {
            title: 'Off',
            value: 0
          },
          {
            title: '3secs',
            value: 3
          },
          {
            title: '5secs',
            value: 5
          },
          {
            title: '10secs ',
            value: 10
          }
        ],
        selected: 0,
        persistent: false,
        menu: 3
      },
    });
  });

  suite('Config()', function() {
    test('Should normalize flat properties', function() {
      var maxResolution = this.config.get('maxResolution');

      assert.ok(maxResolution.options.length === 1);
      assert.ok(maxResolution.options[0].value === 999);
      assert.ok(maxResolution.title === 'maxResolution');
    });
  });

  suite('Config#get()', function() {
    test('Should return the key from the config', function() {
      var hdr = this.config.get('timer');
      assert.ok(hdr.title === 'Self Timer');
    });

    test('Should return undefined for undefined keys', function() {
      var diego = this.config.get('diego');
      assert.ok(diego === undefined);
    });
  });

});
