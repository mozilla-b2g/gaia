'use strict';

/* global UserDictionaryEditPanel, MockEventTarget, KeyEvent */

require('/shared/test/unit/mocks/mock_event_target.js');

require('/js/settings/user_dictionary_edit_panel.js');

suite('UserDictionary Edit Panel', function() {
  var panel;
  var stubContainer;
  var stubGetElemById;

  var stubHeader;
  var stubSaveWordBtn;
  var stubInput;
  var stubDeleteBtn;
  var stubDialogCancelBtn;
  var stubDialogDeleteBtn;

  setup(function() {
    panel = new UserDictionaryEditPanel();

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

    panel.init();

    assert.isTrue(stubGetElemById.calledWith('panel-ud-editword'));

    assert.equal(panel._inputField, stubInput);
  });

  teardown(function() {
    panel.uninit();
  });

  suite('Transition hooks', function() {
    suite('beforeShow', function() {
      test('call init if necessary', function() {
        panel._initialized = false;
        this.sinon.stub(panel, 'init');

        panel.beforeShow();

        assert.isTrue(panel.init.called);
      });

      test('edit mode', function() {
        panel.beforeShow({
          word: 'star'
        });

        assert.isTrue(stubContainer.classList.remove.calledWith('add-mode'));
        assert.equal(panel._inputField.value, 'star');
        assert.equal(panel._oldWord, 'star');
    });

      test('add mode', function() {
        panel.beforeShow();

        assert.isTrue(stubContainer.classList.add.calledWith('add-mode'));
        assert.strictEqual(panel._oldWord, undefined);
      });
    });

    test('show', function() {
      stubInput.focus = this.sinon.spy();

      panel.show();

      assert.isTrue(stubHeader.addEventListener.calledWith('action', panel));
      assert.isTrue(
        stubSaveWordBtn.addEventListener.calledWith('click', panel));
      assert.isTrue(stubInput.addEventListener.calledWith('keydown', panel));
      assert.isTrue(stubDeleteBtn.addEventListener.calledWith('click', panel));
      assert.isTrue(
        stubDialogCancelBtn.addEventListener.calledWith('click', panel));
      assert.isTrue(
        stubDialogDeleteBtn.addEventListener.calledWith('click', panel));

      assert.isTrue(stubInput.focus.called);
    });

    test('beforeHide', function() {
      panel.beforeHide();

      assert.isTrue(stubHeader.removeEventListener.calledWith('action', panel));
      assert.isTrue(
        stubSaveWordBtn.removeEventListener.calledWith('click', panel));
      assert.isTrue(stubInput.removeEventListener.calledWith('keydown', panel));
      assert.isTrue(
        stubDeleteBtn.removeEventListener.calledWith('click', panel));
      assert.isTrue(
        stubDialogCancelBtn.removeEventListener.calledWith('click', panel));
      assert.isTrue(
        stubDialogDeleteBtn.removeEventListener.calledWith('click', panel));
    });

    test('hide', function() {
      panel.hide();

      assert.strictEqual(panel._inputField.value, '');
      assert.strictEqual(panel._oldWord, undefined);
    });
  });

  suite('Event handling', function() {
    // this suite includes behavioral tests for _commitWord, _removeWord
    // and _cancel

    var stubDeleteDialog;

    setup(function() {
      panel.onsubmit = this.sinon.spy();

      stubDeleteDialog = {
        setAttribute: this.sinon.spy(),
        removeAttribute: this.sinon.spy()
      };

      stubContainer.querySelector
        .withArgs('#ud-editword-delete-dialog').returns(stubDeleteDialog);      
    });

    test('action -> cancel', function() {
      panel.handleEvent({type: 'action'});

      assert.isTrue(panel.onsubmit.calledWith({action: 'cancel'}));
    });

    test('enter key -> submit', function() {
      stubInput.value = 'star';
      stubInput.blur = this.sinon.spy();
      panel.handleEvent({type: 'keydown', keyCode: KeyEvent.DOM_VK_RETURN});

      assert.isTrue(stubInput.blur.called);
      assert.isTrue(
        panel.onsubmit.calledWith({action: 'commit', word: 'star'}));
    });

    test('save button -> submit', function() {
      stubInput.value = 'star';
      panel.handleEvent({type: 'click', target: {id: 'ud-saveword-btn'}});

      assert.isTrue(
        panel.onsubmit.calledWith({action: 'commit', word: 'star'}));
    });

    test('delete button -> show dialog', function() {
      panel._oldWord = 'oldstar';

      var oldMozL10n = navigator.mozL10n;
      navigator.mozL10n = {
        setAttributes: this.sinon.spy()
      };

      stubContainer.querySelector
        .withArgs('#ud-editword-delete-prompt').returns('dummy-delete');

      panel.handleEvent({
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
      panel.handleEvent({
        type: 'click',
        target: {id: 'ud-editword-dialog-delete-btn'}
      });

      assert.isTrue(
        panel.onsubmit.calledWith({action: 'remove'}));

      assert.isTrue(stubDeleteDialog.setAttribute.calledWith('hidden', true));
    });

    test('dialog cancel button -> hide dialog', function() {
      panel.handleEvent({
        type: 'click',
        target: {id: 'ud-editword-dialog-cancel-btn'}
      });

      assert.isFalse(
        panel.onsubmit.calledWith({action: 'remove'}));

      assert.isTrue(stubDeleteDialog.setAttribute.calledWith('hidden', true));
    });
  });
});
