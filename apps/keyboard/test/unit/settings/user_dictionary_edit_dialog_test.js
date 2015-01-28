'use strict';

/* global UserDictionaryEditDialog, MockEventTarget, KeyEvent, BaseView */

require('/shared/test/unit/mocks/mock_event_target.js');

require('/js/settings/base_view.js');
require('/js/settings/user_dictionary_edit_dialog.js');

suite('UserDictionary Edit Dialog', function() {
  var dialog;
  var stubContainer;
  var stubGetElemById;

  var stubHeader;
  var stubSaveWordBtn;
  var stubInput;
  var stubDeleteBtn;
  var stubDialogCancelBtn;
  var stubDialogDeleteBtn;

  setup(function() {
    dialog = new UserDictionaryEditDialog();

    stubContainer = {
      querySelector:
        this.sinon.stub().returns(() => this.sinon.stub(new MockEventTarget())),
      classList: {
        add: this.sinon.spy(),
        remove: this.sinon.spy()
      }
    };

    stubHeader = this.sinon.stub(new MockEventTarget());
    stubSaveWordBtn = this.sinon.stub(new MockEventTarget());
    stubInput = this.sinon.stub(new MockEventTarget());
    stubDeleteBtn = this.sinon.stub(new MockEventTarget());
    stubDialogCancelBtn = this.sinon.stub(new MockEventTarget());
    stubDialogDeleteBtn = this.sinon.stub(new MockEventTarget());

    stubGetElemById =
      this.sinon.stub(document, 'getElementById').returns(stubContainer);

    stubContainer.querySelector
      .withArgs('#ud-editword-header').returns(stubHeader);
    stubContainer.querySelector
      .withArgs('#ud-saveword-btn').returns(stubSaveWordBtn);
    stubContainer.querySelector
      .withArgs('#ud-editword-input').returns(stubInput);
    stubContainer.querySelector
      .withArgs('#ud-editword-delete-btn').returns(stubDeleteBtn);
    stubContainer.querySelector
      .withArgs('#ud-editword-dialog-cancel-btn').returns(stubDialogCancelBtn);
    stubContainer.querySelector
      .withArgs('#ud-editword-dialog-delete-btn').returns(stubDialogDeleteBtn);

    dialog.start();

    assert.isTrue(stubGetElemById.calledWith('panel-ud-editword'));

    assert.equal(dialog._inputField, stubInput);
  });

  teardown(function() {
    dialog.stop();
  });

  test('inheritance from BaseView', function() {
    assert.instanceOf(dialog, BaseView);
  });

  suite('Transition hooks', function() {
    suite('beforeShow', function() {
      test('edit mode', function() {
        dialog.beforeShow({
          word: 'star'
        });

        assert.isTrue(stubContainer.classList.remove.calledWith('add-mode'));
        assert.equal(dialog._inputField.value, 'star');
        assert.equal(dialog._oldWord, 'star');
    });

      test('add mode', function() {
        dialog.beforeShow();

        assert.isTrue(stubContainer.classList.add.calledWith('add-mode'));
        assert.strictEqual(dialog._oldWord, undefined);
      });
    });

    test('show', function() {
      stubInput.focus = this.sinon.spy();

      dialog.show();

      assert.isTrue(stubHeader.addEventListener.calledWith('action', dialog));
      assert.isTrue(
        stubSaveWordBtn.addEventListener.calledWith('click', dialog));
      assert.isTrue(stubInput.addEventListener.calledWith('keydown', dialog));
      assert.isTrue(stubDeleteBtn.addEventListener.calledWith('click', dialog));
      assert.isTrue(
        stubDialogCancelBtn.addEventListener.calledWith('click', dialog));
      assert.isTrue(
        stubDialogDeleteBtn.addEventListener.calledWith('click', dialog));

      assert.isTrue(stubInput.focus.called);
    });

    test('beforeHide', function() {
      dialog.beforeHide();

      assert.isTrue(
        stubHeader.removeEventListener.calledWith('action', dialog));
      assert.isTrue(
        stubSaveWordBtn.removeEventListener.calledWith('click', dialog));
      assert.isTrue(
        stubInput.removeEventListener.calledWith('keydown', dialog));
      assert.isTrue(
        stubDeleteBtn.removeEventListener.calledWith('click', dialog));
      assert.isTrue(
        stubDialogCancelBtn.removeEventListener.calledWith('click', dialog));
      assert.isTrue(
        stubDialogDeleteBtn.removeEventListener.calledWith('click', dialog));
    });

    test('hide', function() {
      dialog.hide();

      assert.strictEqual(dialog._inputField.value, '');
      assert.strictEqual(dialog._oldWord, undefined);
    });
  });

  suite('Event handling', function() {
    // this suite includes behavioral tests for _commitWord, _removeWord
    // and _cancel

    var stubDeleteDialog;

    setup(function() {
      dialog.onsubmit = this.sinon.spy();

      stubDeleteDialog = {
        setAttribute: this.sinon.spy(),
        removeAttribute: this.sinon.spy()
      };

      stubContainer.querySelector
        .withArgs('#ud-editword-delete-dialog').returns(stubDeleteDialog);      
    });

    test('action -> cancel', function() {
      dialog.handleEvent({type: 'action'});

      assert.isTrue(dialog.onsubmit.calledWith({action: 'cancel'}));
    });

    test('enter key -> submit', function() {
      stubInput.value = 'star';
      stubInput.blur = this.sinon.spy();
      dialog.handleEvent({type: 'keydown', keyCode: KeyEvent.DOM_VK_RETURN});

      assert.isTrue(stubInput.blur.called);
      assert.isTrue(
        dialog.onsubmit.calledWith({action: 'commit', word: 'star'}));
    });

    test('save button -> submit', function() {
      stubInput.value = 'star';
      dialog.handleEvent({type: 'click', target: {id: 'ud-saveword-btn'}});

      assert.isTrue(
        dialog.onsubmit.calledWith({action: 'commit', word: 'star'}));
    });

    test('delete button -> show dialog', function() {
      dialog._oldWord = 'oldstar';

      var oldMozL10n = navigator.mozL10n;
      navigator.mozL10n = {
        setAttributes: this.sinon.spy()
      };

      stubContainer.querySelector
        .withArgs('#ud-editword-delete-prompt').returns('dummy-delete');

      dialog.handleEvent({
        type: 'click',
        target: {id: 'ud-editword-delete-btn'}
      });

      assert.isTrue(navigator.mozL10n.setAttributes.calledWith(
        'dummy-delete',
        'userDictionaryDeletePrompt',
        {word: 'oldstar'}
      ));

      assert.isTrue(stubDeleteDialog.removeAttribute.calledWith('hidden'));

      navigator.mozL10n = oldMozL10n;
    });

    test('dialog delete button -> delete & hide dialog', function() {
      dialog.handleEvent({
        type: 'click',
        target: {id: 'ud-editword-dialog-delete-btn'}
      });

      assert.isTrue(
        dialog.onsubmit.calledWith({action: 'remove'}));

      assert.isTrue(stubDeleteDialog.setAttribute.calledWith('hidden', true));
    });

    test('dialog cancel button -> hide dialog', function() {
      dialog.handleEvent({
        type: 'click',
        target: {id: 'ud-editword-dialog-cancel-btn'}
      });

      assert.isFalse(
        dialog.onsubmit.calledWith({action: 'remove'}));

      assert.isTrue(stubDeleteDialog.setAttribute.calledWith('hidden', true));
    });
  });
});
