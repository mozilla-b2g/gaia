'use strict';

suite('BaseDialog > ', function() {
  var baseDialog;

  setup(function(done) {
    var requireCtx = testRequire([], {}, function() {});
    requireCtx([
      'modules/dialog/base_dialog'
    ], function(BaseDialog) {
      var panelDOM = document.createElement('div');
      baseDialog = new BaseDialog(panelDOM, {});
      done();
    });
  });

  suite('_getWrapL10nObject > ', function() {
    test('input is string', function() {
      var fakeL10nId = 'Fake';
      var result = baseDialog._getWrapL10nObject(fakeL10nId);
      assert.equal(typeof result, 'object');
      assert.equal(result.id, fakeL10nId);
      assert.isNull(result.args);
    });

    test('input is object, but forgot to put id', function() {
      this.sinon.spy(baseDialog, '_getWrapL10nObject');
      var fakeL10nObject = {args: {}};
      try {
        baseDialog._getWrapL10nObject(fakeL10nObject);
      } catch(e) {
        assert.ok(true, 'we wil throw error');
      }
    });

    test('input is object, but no args', function() {
      var fakeL10nObject = {id: 'Fake'};
      var result = baseDialog._getWrapL10nObject(fakeL10nObject);
      assert.equal(result.id, fakeL10nObject.id);
      assert.isNull(result.args, 'we will set null on it');
    });

    test('input is object, with id and args', function() {
      var fakeL10nObject = {id: 'Fake', args: {}};
      var result = baseDialog._getWrapL10nObject(fakeL10nObject);
      assert.equal(result.id, fakeL10nObject.id);
      assert.equal(result.args, fakeL10nObject.args);
    });
  });

  suite('cleanup > ', function() {
    setup(function() {
      this.sinon.stub(baseDialog, '_updateTitle');
      this.sinon.stub(baseDialog, '_updateSubmitButton');
      this.sinon.stub(baseDialog, '_updateCancelButton');
      this.sinon.stub(baseDialog.panel.classList, 'remove');
    });

    suite('if this is custom dialog', function() {
      setup(function() {
        baseDialog.DIALOG_CLASS = 'panel-dialog';
        baseDialog.cleanup();
      });

      test('we would not restore its title and button', function() {
        assert.isFalse(baseDialog._updateTitle.called);
        assert.isFalse(baseDialog._updateSubmitButton.called);
        assert.isFalse(baseDialog._updateCancelButton.called);

        assert.equal(baseDialog.panel.classList.remove.getCall(0).args[0],
          baseDialog.DIALOG_CLASS);
        assert.equal(baseDialog.panel.classList.remove.getCall(1).args[0],
          baseDialog.TRANSITION_CLASS);
      });
    });

    suite('if this is system-wise dialog', function() {
      setup(function() {
        baseDialog.DIALOG_CLASS = 'alert-dialog';
        baseDialog.cleanup();
      });

      test('we would restore its title and button', function() {
        assert.isTrue(baseDialog._updateTitle.called);
        assert.isTrue(baseDialog._updateSubmitButton.called);
        assert.isTrue(baseDialog._updateCancelButton.called);

        assert.equal(baseDialog.panel.classList.remove.getCall(0).args[0],
          baseDialog.DIALOG_CLASS);
        assert.equal(baseDialog.panel.classList.remove.getCall(1).args[0],
          baseDialog.TRANSITION_CLASS);
      });
    });
  });
});
