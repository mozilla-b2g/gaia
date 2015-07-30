suite('views/setting', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'views/setting'
    ], function(SettingView) {
      self.SettingView = SettingView;
      done();
    });
  });

  setup(function() {
    this.sandbox = sinon.sandbox.create();
    this.model = {
      on: sinon.spy(),
      selected: sinon.stub().returns({ title: 'title' }),
      get: sinon.stub().returns({ title: 'title', value: 'value' })
    };
    this.model.get.withArgs('title').returns('title');
    this.view = new this.SettingView({ model: this.model });
  });

  teardown(function() {
    this.sandbox.restore();
  });

  suite('SettingView#localizeValue()', function() {
    setup(function() {
      this.view.l10n = { get: sinon.stub().returns('localized') };
    });

    test('options are localizable', function() {
      var data = { value: 'value' };
      assert.equal(this.view.localizeValue(data), 'localized');
      assert.isTrue(this.view.l10n.get.calledWith(data.value));
    });

    test('options are not localizable', function() {
      var data = { value: 'value', optionsLocalizable: false };
      assert.equal(this.view.localizeValue(data), data.value);
      sinon.assert.notCalled(this.view.l10n.get);
    });
  });

  suite('SettingView#render()', function() {
    setup(function() {
      this.view.l10n = { setAttributes: sinon.spy() };
      sinon.stub(this.view, 'localizeValue').returns('localized');
      this.view.render();
    });

    test('render setting accessibility', function() {
      assert.equal(this.view.el.getAttribute('role'), 'option');
      assert.isTrue(this.view.l10n.setAttributes.calledWith(this.view.el,
        'setting-option-title', { value: 'localized' }));
      assert.isTrue(this.view.localizeValue.calledWith(this.model.get()));
    });
  });
});
