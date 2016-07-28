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

  suite('SettingView#render()', function() {
    setup(function() {
      this.view.l10n = {
        formatValue: function(id) {
          return Promise.resolve(id);
        },
        setAttributes: sinon.spy()
      };
      this.view.render();
    });

    test('render setting accessibility', function(done) {
      assert.equal(this.view.el.getAttribute('role'), 'option');
      Promise.resolve().then(() => {
        assert.isTrue(this.view.l10n.setAttributes.calledWith(this.view.el,
          'setting-option-title', { value: 'title' }));
        done();
      });
    });
  });
});
