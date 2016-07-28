suite('views/setting-options', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs([
      'views/setting-options'
    ], function(SettingOptionsView) {
      self.SettingOptionsView = SettingOptionsView;
      done();
    });
  });

  setup(function() {
    this.sandbox = sinon.sandbox.create();
    this.view = new this.SettingOptionsView({
      model: { on: sinon.spy(), get: sinon.spy() },
      l10n: {
        formatValue: function(id) {
          return Promise.resolve(id); 
        },
      }
    });
    this.view.els.ul = document.createElement('ul');
  });

  teardown(function() {
    this.sandbox.restore();
  });

  suite('SettingOptionsView#renderOption()', function() {
    var option = {
      key: 'key',
      title: 'title'
    };

    test('localizable not selected', function() {
      this.view.renderOption(true, option);
      var rendered = this.view.els.key;

      assert.equal(rendered.getAttribute('role'), 'option');
      assert.equal(rendered.getAttribute('data-l10n-id'), 'title');
      assert.isNull(rendered.getAttribute('aria-selected'));
    });

    test('not localizable selected', function() {
      // Make current option selected.
      this.view.selectedKey = option.key;

      this.view.renderOption(false, option);
      var rendered = this.view.els.key;

      assert.equal(rendered.getAttribute('role'), 'option');
      assert.equal(rendered.textContent, 'title');
      assert.equal(rendered.getAttribute('aria-selected'), 'true');
    });
  });
});
