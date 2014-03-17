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
        key: 'key',
        options: [
          { key: 'a' },
          { key: 'b' },
          { key: 'c' }
        ]
      });
    });

    test('Should filter the list down be just suppled keys', function() {
      this.setting.resetOptions(['a', 'c']);

      var list = this.setting.get('options');
      var found = {};

      list.forEach(function(item) { found[item.key] = true; });

      assert.ok(!found.b);
      assert.ok(found.a);
      assert.ok(found.c);
    });

    test('Should accept an Object as well as an Array', function() {
      this.setting.resetOptions({
        a: {},
        c: {}
      });

      var list = this.setting.get('options');
      var found = {};

      list.forEach(function(item) { found[item.key] = true; });

      assert.ok(!found.b);
      assert.ok(found.a);
      assert.ok(found.c);
    });

    test('Should accept an Array of Objects with `key` properties', function() {
      this.setting.resetOptions([
        { key: 'a' },
        { key: 'c' }
      ]);

      var list = this.setting.get('options');
      var found = {};

      list.forEach(function(item) { found[item.key] = true; });

      assert.ok(!found.b);
      assert.ok(found.a);
      assert.ok(found.c);
    });

    test('Should sort the options list by the original config index', function() {
      this.setting.resetOptions([
        { key: 'b' },
        { key: 'a' }
      ]);

      var list = this.setting.get('options');
      assert.ok(list[0].key === 'a');
      assert.ok(list[1].key === 'b');
    });

    test('Should fire a `optionsreset` event', function() {
      var spy = sinon.spy();
      this.setting.on('optionsreset', spy);
      this.setting.resetOptions(['a', 'b']);
      assert.ok(spy.called);
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

  suite('Setting#format()', function() {
    test('Should format a simple array into a list of objects', function() {
      var data = ['a', 'b', 'c'];
      var output = this.Setting.prototype.format(data);

      assert.ok(output[0].key === 'a');
      assert.ok(output[1].key === 'b');
      assert.ok(output[2].key === 'c');
      assert.ok(output.length === 3);
    });

    test('Should accept an array of objects', function() {
      var output = this.Setting.prototype.format([
        { key: 'a' },
        { key: 'b' },
        { key: 'c' },
      ]);

      assert.ok(output[0].key === 'a');
      assert.ok(output[1].key === 'b');
      assert.ok(output[2].key === 'c');
      assert.ok(output.length === 3);
    });

    test('Should format array keys correctly', function() {
      var data = [{ key: 'a'}, { nokey: 'b' }, 'c'];
      var output = this.Setting.prototype.format(data);

      assert.ok(output[0].key === 'a');
      assert.ok(output[1].key === undefined);
      assert.ok(output[2].key === 'c');
      assert.ok(output.length === 3);
    });

    test('Should extract data correctly', function() {
      var output = this.Setting.prototype.format({
        a: { some: 'a-content' },
        b: { data: { some: 'b-content' } },
        c: 'c-content'
      });

      assert.ok(output[0].data.some === 'a-content');
      assert.ok(output[1].data.some === 'b-content');
      assert.ok(output[2].data === 'c-content');

      output = this.Setting.prototype.format([
        { key: 'a', data: 'a-content' },
        { key: 'b', some: 'b-content' },
        'c'
      ]);

      assert.ok(output[0].data === 'a-content');
      assert.ok(output[1].data.some === 'b-content');
      assert.ok(!output[2].data);
    });

    test('Should format an object correctly', function() {
      var data = {
        a: { stuff: 'a-stuff' },
        b: { stuff: 'b-stuff' },
        c: { stuff: 'c-stuff' }
      };

      var output = this.Setting.prototype.format(data);

      assert.ok(output[0].key === 'a');
      assert.ok(output[1].key === 'b');
      assert.ok(output[2].key === 'c');
      assert.ok(output[0].data.stuff === 'a-stuff');
      assert.ok(output[1].data.stuff === 'b-stuff');
      assert.ok(output[2].data.stuff === 'c-stuff');
      assert.ok(output.length === 3);
    });
  });

  suite('Setting#localize()', function() {
    setup(function() {
      this.mozL10n = { get: sinon.stub().returns('replaced') };
    });

    test('Should add localized keys found in `l10n` object' , function() {
      var setting = new this.Setting({
        options: [],
        mozL10n: this.mozL10n,
        l10n: {
          title: 'my-title'
        }
      });

      setting.localize();
      assert.ok(setting.get('title') === 'replaced');
    });

    test('Should not localize `title` strings without \'l10n-\' prefix', function() {
      var setting = new this.Setting({
        title: 'My title',
        options: [],
        mozL10n: this.mozL10n
      });

      setting.localize();
      assert.ok(setting.get('title') === 'My title');
    });

    test('Should localize options `title` strings prefixed with \'l10n\'', function() {
      var setting = new this.Setting({
        options: [
          {
            l10n: {
              title: 'my-option-title'
            }
          },
          {
            l10n: {
              title: 'my-option-title'
            }
          },
          {
            title: 'My option title'
          }
        ],
        mozL10n: this.mozL10n
      });

      setting.localize();

      var options = setting.get('options');
      assert.ok(options[0].title === 'replaced');
      assert.ok(options[1].title === 'replaced');
      assert.ok(options[2].title === 'My option title');
    });

    test('Should fire a \'change\' event', function() {
      var spy = sinon.spy();
      var setting = new this.Setting({
        title: 'My title',
        options: [],
        mozL10n: this.mozL10n
      });

      setting.on('change', spy);
      setting.localize();
      assert.ok(spy.called);
    });
  });
});
