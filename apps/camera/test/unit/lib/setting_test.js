suite('lib/setting', function() {
  'use strict';
  var require = window.req;

  suiteSetup(function(done) {
    var self = this;
    require(['lib/setting'], function(Setting) {
      self.Setting = Setting;
      done();
    });
  });

  setup(function() {
    this.storage = {
      getItem: sinon.stub(),
      setItem: sinon.stub()
    };
  });

  suite('Setting()', function() {
    setup(function() {
      this.sandbox = sinon.sandbox.create();
    });

    teardown(function() {
      this.sandbox.restore();
    });

    test('Should store the key on self', function() {
      var setting = new this.Setting({ key: 'mykey', options: [] });
      assert.ok(setting.key === 'mykey');
    });

    test('Should save when selection is change, only if marked as `persistent`', function() {
      var on = this.sandbox.spy(this.Setting.prototype, 'on');
      var settings1 = new this.Setting({
        key: 'key',
        persistent: true,
        options: []
      });

      assert.ok(on.calledWith('change:selected', settings1.save));
      on.reset();

      var settings2 = new this.Setting({ key: 'key', options: [] });
      assert.ok(!on.calledWith('change:selected', settings2.save));
    });

    test('Should default to selecting first option if ' +
    '`selected` is undefined', function() {
      var setting = new this.Setting({
        key: 'key',
        options: [
          { key: 'a' },
          { key: 'b' }
        ]
      });

      assert.ok(setting.get('selected') === 'a');
    });

    test('Should flag `options.defined` if options initially defined', function() {
      var setting = new this.Setting({
        key: 'key',
        options: [
          { key: 'a' },
          { key: 'b' }
        ]
      });

      assert.isTrue(setting.options.defined);

      setting = new this.Setting({
        key: 'key',
        options: []
      });

      assert.isFalse(setting.options.defined);
    });
  });

  suite('Setting#select()', function() {
    setup(function() {
      this.setting = new this.Setting({
        key: 'key',
        options: [
          { key: 'a' },
          { key: 'b' }
        ]
      });
    });

    test('Should select the first option if no key match', function() {
      this.setting.select('b');
      assert.ok(this.setting.get('selected') === 'b');

      // Fallback to first
      this.setting.select('c');
      assert.ok(this.setting.get('selected') === 'a');
      this.setting.select(3);
      assert.ok(this.setting.get('selected') === 'a');
    });
  });

  suite('Setting#resetOptions()', function() {
    setup(function() {
      this.setting = new this.Setting({
        selected: 'b',
        options: [
          { key: 'a' },
          { key: 'b' },
          { key: 'c' }
        ]
      });
    });

    test('Should update the `selected` option to first if no new options match selected', function() {
      this.setting.resetOptions([
        { key: 'd' },
        { key: 'e' },
        { key: 'f' }
      ]);

      assert.equal(this.setting.selected('key'), 'd');
    });

    test('Should maintain the selected key if a key of new options matches', function() {
      this.setting.resetOptions([
        { key: 'c' },
        { key: 'b' },
        { key: 'a' }
      ]);

      assert.equal(this.setting.selected('key'), 'b');
    });

    test('Should maintain the order', function() {
      var options;

      this.setting.resetOptions([
        { key: 'a' },
        { key: 'b' },
        { key: 'c' }
      ]);

      options = this.setting.get('options');
      assert.equal(options[0].key, 'a');
      assert.equal(options[1].key, 'b');
      assert.equal(options[2].key, 'c');

      this.setting.resetOptions([
        { key: 'c' },
        { key: 'b' },
        { key: 'a' }
      ]);

      options = this.setting.get('options');
      assert.equal(options[0].key, 'c');
      assert.equal(options[1].key, 'b');
      assert.equal(options[2].key, 'a');
    });

    test('Should not fire a `change` event', function() {
      var spy = sinon.spy();

      this.setting.on('change', spy);
      this.setting.resetOptions([{ key: 'c' }]);

      assert.isFalse(spy.called);
    });
  });

  suite('Setting#filterOptions()', function() {
    setup(function() {
      this.setting = new this.Setting({
        key: 'key',
        selected: 'b',
        options: [
          { key: 'a' },
          { key: 'b' },
          { key: 'c' }
        ]
      });
    });

    test('Should filter down the available options', function() {
      this.setting.filterOptions(['a', 'b']);

      var available = this.setting.get('options');
      var found = available.some(function(option) { return option.key === 'c'; });

      assert.isFalse(found, 'c should not longer be present');
    });

    test('Should have no available options if argument is falsy', function() {
      var available;

      this.setting.filterOptions(null);
      available = this.setting.get('options');
      assert.equal(available.length, 0);

      this.setting.filterOptions(undefined);
      available = this.setting.get('options');
      assert.equal(available.length, 0);

      this.setting.filterOptions(false);
      available = this.setting.get('options');
      assert.equal(available.length, 0);
    });

    test('Should always filter the original config', function() {
      var available;

      this.setting.filterOptions(['a', 'b']);
      available = this.setting.get('options');
      assert.equal(available.length, 2);
      assert.equal(available[0].key, 'a');
      assert.equal(available[1].key, 'b');

      this.setting.filterOptions(['c']);
      available = this.setting.get('options');
      assert.equal(available.length, 1);
      assert.equal(available[0].key, 'c');
    });

    test('Should maintain `selected` if in filter list', function() {
      this.setting.filterOptions(['c', 'b']);
      assert.equal(this.setting.selected('key'), 'b');
    });

    test('Should update the `selected` match first if not in filter list', function() {
      this.setting.filterOptions(['c', 'a']);
      assert.equal(this.setting.selected('key'), 'a');
    });

    test('Should not fire a `change` event', function() {
      var spy = sinon.spy();

      this.setting.on('change', spy);
      this.setting.filterOptions(['c']);

      assert.isFalse(spy.called);
    });

    test('Should cope with keys that aren\'t defined', function() {
      var spy = sinon.spy();

      this.setting.filterOptions(['a', 'c', 'jibberish']);
      var options = this.setting.get('options');

      assert.equal(options.length, 2);
      assert.equal(options[0].key, 'a');
      assert.equal(options[1].key, 'c');
    });
  });

  suite('Setting#selected()', function() {
    setup(function() {
      this.setting = new this.Setting({
        key: 'key',
        options: [
          { key: 'a', title: 'i am a' },
          { key: 'b', title: 'i am b'  },
          { key: 'c', title: 'i am c'  }
        ]
      });
    });

    test('Should return the currently selected option', function() {
      var selected = this.setting.selected();
      assert.ok(selected.title === 'i am a');

      this.setting.select('b');

      selected = this.setting.selected();
      assert.ok(selected.title === 'i am b');
    });

    test('Should return the given key from the selected option', function() {
      var title = this.setting.selected('title');
      assert.ok(title === 'i am a');

      this.setting.select('b');

      var key = this.setting.selected('key');
      assert.ok(key === 'b');
    });

    test('Should return `undefined` if no available options', function() {
      this.setting.filterOptions([]);

      assert.equal(this.setting.selected(), undefined);
      assert.equal(this.setting.selected('key'), undefined);
    });
  });

  suite('Setting#next()', function() {
    setup(function() {
      this.setting = new this.Setting({
        key: 'key',
        options: [
          { key: 'a' },
          { key: 'b' },
          { key: 'c' }
        ]
      });
    });

    test('Should set the `selected` value to the next option', function() {
      this.setting.next();
      assert.ok(this.setting.selected().key === 'b');
      this.setting.next();
      assert.ok(this.setting.selected().key === 'c');
      this.setting.next();
      assert.ok(this.setting.selected().key === 'a');
    });
  });

  suite('Setting#supported()', function() {
    setup(function() {
      this.config = {
        title: 'My title',
        options: [{ key: 'a' }, { key: 'b' }]
      };
    });

    test('Should return false if disabled', function() {
      var setting;

      this.config.disabled = true;
      setting = new this.Setting(this.config);
      assert.isFalse(setting.supported());

      this.config.disabled = false;
      setting = new this.Setting(this.config);
      assert.isTrue(setting.supported());

      delete this.config.disabled;
      setting = new this.Setting(this.config);
      assert.isTrue(setting.supported());
    });

    test('Should return true if not disabled and has options', function() {
      var setting;

      setting = new this.Setting(this.config);
      assert.isTrue(setting.supported());

      this.config.options = [];
      setting = new this.Setting(this.config);
      assert.isFalse(setting.supported());
    });
  });

  suite('Setting#fetch()', function() {
    setup(function() {
      this.setting = new this.Setting({
        key: 'foo',
        storage: this.storage
      });
    });

    test('Should `select` silently the given key if one is in storage', function() {
      sinon.spy(this.setting, 'selected');

      this.setting.fetch();
      assert.isFalse(this.setting.selected.called);

      this.storage.getItem
        .withArgs('setting:' + this.setting.key)
        .returns('the-key');

      this.setting.fetch();
      assert.isFalse(this.setting.selected.calledWith('the-key'));
    });

    test('Should not fire a `change` event', function() {
      var spy = sinon.spy();

      this.storage.getItem
        .withArgs('setting:' + this.setting.key)
        .returns('the-key');

      this.setting.on('change', spy);
      this.setting.fetch();

      assert.isFalse(spy.called);
    });
  });

  suite('Setting#save()', function() {
    setup(function() {
      this.setting = new this.Setting({
        key: 'foo',
        storage: this.storage,
        options: [
          { key: 'a' },
          { key: 'b' }
        ]
      });
    });

    test('Should call `setItem` with the current selected option key', function() {
      var key = 'setting:' + this.setting.key;
      var value = this.setting.selected('key');

      this.setting.save();
      assert.isTrue(this.storage.setItem.calledWith(key, value));
    });
  });
});
