suite('views/settings', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'views/settings',
      'views/setting-options'
    ], function(SettingsView, OptionsView) {
      self.SettingsView = SettingsView;
      self.OptionsView = OptionsView;
      done();
    });
  });

  setup(function() {
    var self = this;
    this.sandbox = sinon.sandbox.create();

    var OptionsView = sinon.spy(function() {
      var view = sinon.createStubInstance(self.OptionsView);
      view.render.returns(view);
      view.appendTo.returns(view);
      view.on.returns(view);
      return view;
    });

    this.view = new this.SettingsView({ OptionsView: OptionsView });
  });

  teardown(function() {
    this.sandbox.restore();
  });

  suite('SettingsView#onClick()', function() {
    test('Should not let clicks propagate', function() {
      var spy = sinon.spy();
      this.view.onClick({ stopPropagation: spy });
      assert.isTrue(spy.called);
    });
  });

  suite('SettingsView#showSetting()', function() {
    setup(function() {
      this.model = {};
      this.sandbox.spy(this.view, 'showPane');
      this.view.showSetting(this.model);
    });

    test('Should create and append a new OptionsView', function() {
      assert.isTrue(this.view.OptionsView.called);
      assert.isTrue(this.view.optionsView.appendTo.called);
    });

    test('Should pass the model into the OptionsView', function() {
      var options = this.view.OptionsView.args[0][0];
      assert.equal(options.model, this.model);
    });

    test('Should show pane 2', function() {
      assert.isTrue(this.view.showPane.calledWith(2));
    });
  });

  suite('SettingsView#goBack()', function() {
    test('Should destroy the options view (sync)', function() {
      var options = this.view.optionsView = { destroy: sinon.spy() };
      this.view.goBack();
      assert.isTrue(options.destroy.called);
    });

    test('Should switch back to pane 1', function() {
      sinon.spy(this.view, 'showPane');
      this.view.goBack();
      assert.isTrue(this.view.showPane.calledWith(1));
    });
  });
});
