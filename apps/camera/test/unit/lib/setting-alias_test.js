suite('lib/setting-alias', function() {
  /*jshint maxlen:false*/
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'lib/setting',
      'lib/setting-alias',
    ], function(Setting, SettingAlias) {
      self.Setting = Setting;
      self.SettingAlias = SettingAlias;
      done();
    });
  });

  setup(function() {
    var self = this;

    // We use this object to store state
    // as nested Suites and tests' context
    // inherits from this context.
    this.state = {};
    this.state.value = 'a';

    this.settings = {
      a: new this.Setting({ key: 'a' }),
      b: new this.Setting({ key: 'b' })
    };

    this.alias = new this.SettingAlias({
      key: 'my-alias',
      settings: this.settings,
      get: function() {
        return this.settings[self.state.value];
      }
    });
  });

  suite('SettingAlias()', function() {
    test('It stores `key` and `settings` options', function() {
      assert.equal(this.alias.key, 'my-alias');
      assert.equal(this.alias.settings, this.settings);
    });
  });

  suite('SettingAlias#current()', function() {
    test('It returns the current setting', function() {
      assert.equal(this.alias.current().key, 'a');
      this.state.value = 'b';
      assert.equal(this.alias.current().key, 'b');
    });
  });

  suite('SettingAlias#on()', function() {
    test('Should fire callback when *current* setting emits event', function() {
      var callback = sinon.spy();
      this.alias.on('event', callback);
      this.settings.a.fire('event');
      this.settings.b.fire('event');
      sinon.assert.calledOnce(callback);
    });

    test('Should pass arguments to the callback', function() {
      var callback = sinon.spy();
      this.alias.on('event', callback);
      this.settings.a.fire('event', 'a', 'b');
      assert.ok(callback.calledWith('a', 'b'));
    });
  });

  suite('SettingAlias#off()', function() {
    test('it calls the callback once', function() {
      var callback = sinon.spy();

      this.alias.on('event', callback);
      this.settings.a.fire('event');

      sinon.assert.calledOnce(callback);
    });

    test('It only removes the listeners that match the callback given', function() {
      var callback1 = sinon.spy();
      var callback2 = sinon.stub();

      this.alias.on('event', callback1);
      this.alias.on('event', callback2);

      this.settings.a.fire('event');

      sinon.assert.calledOnce(callback1);
      sinon.assert.calledOnce(callback2);

      callback1.reset();
      callback2.reset();

      this.alias.off('event', callback1);
      this.settings.a.fire('event');

      sinon.assert.calledOnce(callback2);
      sinon.assert.notCalled(callback1);
    });
  });

  suite('SettingAlias#get()', function() {
    test('It calls the underlying Setting\'s `.get()` method', function() {
      assert.equal(this.alias.get('key'), 'a');
      this.state.value = 'b';
      assert.equal(this.alias.get('key'), 'b');
    });
  });

  test('It forwards the setting mathod calls onto the current setting', function() {
    sinon.stub(this.settings.a);
    sinon.stub(this.settings.b);

    this.alias.filterOptions();
    this.alias.resetOptions();
    this.alias.supported();
    this.alias.selected();
    this.alias.select();
    this.alias.next();
    this.alias.get();
    this.alias.set();

    sinon.assert.calledOnce(this.settings.a.filterOptions);
    sinon.assert.calledOnce(this.settings.a.resetOptions);
    sinon.assert.calledOnce(this.settings.a.supported);
    sinon.assert.calledOnce(this.settings.a.selected);
    sinon.assert.calledOnce(this.settings.a.select);
    sinon.assert.calledOnce(this.settings.a.next);
    sinon.assert.calledOnce(this.settings.a.get);
    sinon.assert.calledOnce(this.settings.a.set);

    // Change state
    this.state.value = 'b';

    this.alias.filterOptions();
    this.alias.resetOptions();
    this.alias.supported();
    this.alias.selected();
    this.alias.select();
    this.alias.next();
    this.alias.get();
    this.alias.set();

    sinon.assert.calledOnce(this.settings.b.filterOptions);
    sinon.assert.calledOnce(this.settings.b.resetOptions);
    sinon.assert.calledOnce(this.settings.b.supported);
    sinon.assert.calledOnce(this.settings.b.selected);
    sinon.assert.calledOnce(this.settings.b.select);
    sinon.assert.calledOnce(this.settings.b.next);
    sinon.assert.calledOnce(this.settings.b.get);
    sinon.assert.calledOnce(this.settings.b.set);
  });
});
