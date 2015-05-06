'use strict';

/* global UserDictionaryListPanel, MockEventTarget, CloseLockManager, CloseLock,
          PanelController, DialogController, UserDictionary, MockPromise,
          BaseView */

require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_promise.js');

require('/js/settings/close_locks.js');
require('/js/settings/base_view.js');
require('/js/settings/general_panel.js');
require('/js/settings/panel_controller.js');
require('/js/settings/user_dictionary.js');

require('/js/settings/user_dictionary_list_panel.js');

suite('UserDictionary List Panel', function() {
  var panel;
  var app;
  var stubUserDictionary;
  var stubContainer;
  var stubGetElemById;

  var stubListContainer;
  var stubHeader;
  var stubAddWordBtn;

  setup(function() {
    stubUserDictionary =
      this.sinon.stub(Object.create(UserDictionary.prototype));
    this.sinon.stub(window, 'UserDictionary')
      .returns(stubUserDictionary);

    app = {
      closeLockManager: this.sinon.stub(new CloseLockManager()),
      panelController: this.sinon.stub(new PanelController()),
      dialogController: this.sinon.stub(new DialogController()),
      userDictionaryEditDialog: 'dummyEditDialog'
    };

    panel = new UserDictionaryListPanel(app);

    stubContainer = {
      querySelector:
        this.sinon.stub().returns(() => this.sinon.stub(new MockEventTarget())),
      classList: {
        add: this.sinon.spy(),
        remove: this.sinon.spy()
      }
    };

    stubListContainer = this.sinon.stub(new MockEventTarget());
    stubListContainer.appendChild = this.sinon.spy();
    stubListContainer.removeChild = this.sinon.spy();
    stubListContainer.childNodes = {};
    stubHeader = this.sinon.stub(new MockEventTarget());
    stubAddWordBtn = this.sinon.stub(new MockEventTarget());

    stubGetElemById =
      this.sinon.stub(document, 'getElementById').returns(stubContainer);

    stubContainer.querySelector
      .withArgs('#ud-wordlist-list').returns(stubListContainer);
    stubContainer.querySelector
      .withArgs('gaia-header').returns(stubHeader);
    stubContainer.querySelector
      .withArgs('#ud-addword-btn').returns(stubAddWordBtn);

    panel.start();

    assert.equal(panel.container, stubContainer);
    assert.equal(panel._listContainer, stubListContainer);

    assert.isTrue(stubUserDictionary.start.called);
  });

  teardown(function() {
    panel.stop();
  });

  test('inheritance from BaseView', function() {
    assert.instanceOf(panel, BaseView);
  });

  suite('Transition hooks', function() {
    suite('beforeShow', function() {
      var p;

      setup(function(){
        p = new MockPromise();
        stubUserDictionary.getList.returns(p);
      });

      test('do not populate more than once', function() {
        panel.beforeShow();
        panel.beforeShow();

        assert.isTrue(stubUserDictionary.getList.calledOnce);
      });

      suite('getList', function() {
        test('empty Set', function(){
          panel.beforeShow();

          p.mFulfillToValue(new Set([]));

          assert.isTrue(stubContainer.classList.add.calledWith('empty'));
        });
        test('Set with contents', function(){
          var stubRearrangeList = this.sinon.stub(panel, '_rearrangeList');

          panel.beforeShow();

          p.mFulfillToValue(new Set(['star', 'stare', 'starry']));

          assert.isTrue(stubContainer.classList.remove.calledWith('empty'));
          assert.isTrue(
            stubRearrangeList.calledWith(new Set(['star', 'stare', 'starry'])));
        });
      });
    });

    test('show', function() {
      panel.show();

      assert.isTrue(stubHeader.addEventListener.calledWith('action', panel));
      assert.isTrue(stubAddWordBtn.addEventListener.calledWith('click', panel));
      assert.isTrue(
        stubListContainer.addEventListener.calledWith('click', panel));
    });

    test('beforeHide', function() {
      panel.beforeHide();

      assert.isTrue(stubHeader.removeEventListener.calledWith('action', panel));
      assert.isTrue(
        stubAddWordBtn.removeEventListener.calledWith('click', panel));
      assert.isTrue(
        stubListContainer.removeEventListener.calledWith('click', panel));
    });
  });

  suite('Event handling', function() {
    test('action -> navigate to root', function() {
      panel.handleEvent({type: 'action'});

      assert.isTrue(app.panelController.navigateToRoot.called);
    });

    test('click on addWordButton -> showAddDialog', function() {
      var stubShowDialog = this.sinon.stub(panel, '_showAddDialog');

      panel.handleEvent({type: 'click', target: {id: 'ud-addword-btn'}});

      assert.isTrue(stubShowDialog.called);
    });

    test('click on word -> showEditDialog', function() {
      var stubShowDialog = this.sinon.stub(panel, '_showEditDialog');
      var target = {tagName: 'LI'};
      var spyPreventDefault = this.sinon.spy();

      panel.handleEvent({
        type: 'click',
        target: target,
        preventDefault: spyPreventDefault
      });

      assert.isTrue(stubShowDialog.calledWith(target));
      assert.isTrue(spyPreventDefault.called);
    });
  });

  test('rearrangeList', function() {
    panel._wordDomMap = {
      star: {t: 'star'},
      starry: {t: 'starry'}
    };

    var stubStareWordElem = {cT: 'stare'};

    this.sinon.stub(panel, '_createWordElem').returns(stubStareWordElem);

    panel._rearrangeList(['star', 'stare', 'starry']);

    // as the order of the words in the list is important, we need to make sure
    // appendChild calls are in the same order.
    assert.isTrue(stubListContainer.appendChild.getCall(0)
      .calledWith(panel._wordDomMap.star));
    assert.isTrue(stubListContainer.appendChild.getCall(1)
      .calledWith(stubStareWordElem));
    assert.isTrue(stubListContainer.appendChild.getCall(2)
      .calledWith(panel._wordDomMap.starry));
  });

  test('createWordElem', function() {
    var stubA = {};
    var stubLI = {
      appendChild: this.sinon.spy()
    };

    var stubCreateElem = this.sinon.stub(document, 'createElement');

    stubCreateElem.withArgs('a').returns(stubA);
    stubCreateElem.withArgs('li').returns(stubLI);

    var ret = panel._createWordElem('star');
    assert.equal(stubLI, ret);

    assert.equal(stubA.textContent, 'star');
    assert.equal(stubA.href, '#star');

    assert.isTrue(stubLI.appendChild.calledWith(stubA));
  });

  suite('showAddDialog', function() {
    // this suite tests addWord behavior too.

    var pDialog;

    setup(function() {
      pDialog = new MockPromise();

      app.dialogController.openDialog.returns(pDialog);
    });

    test('canceled dialog', function() {
      var stubAddWord = this.sinon.stub(panel, '_addWord');

      panel._showAddDialog();

      assert.isTrue(app.dialogController.openDialog.calledWith(
        app.dialogController.userDictionaryEditDialog));

      pDialog.mFulfillToValue({action: 'cancel'});
      assert.isFalse(stubAddWord.called);
    });

    suite('submitted dialog', function() {
      var pAdd;
      var closeLock;

      setup(function(){
        pAdd = new MockPromise();
        closeLock = this.sinon.stub(new CloseLock());

        app.closeLockManager.requestLock.returns(closeLock);

        stubUserDictionary.addWord.returns(pAdd);

        panel._showAddDialog();
      });

      test('white space only (no effect)', function(){
        pDialog.mFulfillToValue({action: 'commit', word: '   \t  '});

        assert.isFalse(app.closeLockManager.requestLock.called);
        assert.isFalse(stubUserDictionary.addWord.called);
      });

      test('successful', function(){
        var stubRearrangeList= this.sinon.stub(panel, '_rearrangeList');

        pDialog.mFulfillToValue({action: 'commit', word: 'star'});

        assert.isTrue(app.closeLockManager.requestLock.calledWith('stayAwake'));
        assert.isTrue(stubUserDictionary.addWord.calledWith('star'));

        pAdd.mFulfillToValue(['star']);

        assert.isTrue(closeLock.unlock.called);
        assert.isTrue(stubContainer.classList.remove.calledWith('empty'));
        assert.isTrue(stubRearrangeList.calledWith(['star']));
      });

      test('still unlocks CloseLock after rejection from model', function(){
        pDialog.mFulfillToValue({action: 'commit', word: 'star'});

        assert.isTrue(app.closeLockManager.requestLock.calledWith('stayAwake'));

        pAdd.mRejectToError();

        assert.isTrue(closeLock.unlock.called);
      });
    });
  });

  suite('showEditDialog', function() {
    // this suite tests removeWord & replaceWord behavior too.

    var pDialog;
    var stubWordElem;

    setup(function() {
      pDialog = new MockPromise();

      stubWordElem = {
        childNodes: [{
          textContent: 'star'
        }]
      };
      panel._domWordMap.set(stubWordElem, 'star');

      app.dialogController.openDialog.returns(pDialog);
    });

    test('word is correctly propogated to dialog', function() {
      panel._showEditDialog(stubWordElem);

      assert.isTrue(app.dialogController.openDialog.calledWith(
        app.dialogController.userDictionaryEditDialog, {word: 'star'}));
    });

    test('canceled dialog', function() {
      var stubRemoveWord = this.sinon.stub(panel, '_removeWord');
      var stubReplaceWord = this.sinon.stub(panel, '_replaceWord');

      panel._showEditDialog(stubWordElem);

      pDialog.mFulfillToValue({action: 'cancel'});

      assert.isFalse(stubReplaceWord.called);
      assert.isFalse(stubRemoveWord.called);
    });

    suite('submitted dialog for remove', function() {
      var pRemove;
      var closeLock;

      setup(function(){
        pRemove = new MockPromise();
        closeLock = this.sinon.stub(new CloseLock());

        app.closeLockManager.requestLock.returns(closeLock);

        stubUserDictionary.removeWord.returns(pRemove);

        panel._showEditDialog(stubWordElem);
      });

      test('successful, list not empty yet', function(){
        stubListContainer.childNodes.length = 2;

        pDialog.mFulfillToValue({action: 'remove'});

        assert.isTrue(app.closeLockManager.requestLock.calledWith('stayAwake'));
        assert.isTrue(stubUserDictionary.removeWord.calledWith('star'));

        pRemove.mFulfillToValue(undefined);

        assert.isTrue(closeLock.unlock.called);
        assert.isFalse(panel._domWordMap.has(stubWordElem));
        assert.isTrue(stubListContainer.removeChild.calledWith(stubWordElem));

        assert.isFalse(stubContainer.classList.add.called);
      });

      test('successful, list empty (partial test)', function(){
        stubListContainer.childNodes.length = 0;

        pDialog.mFulfillToValue({action: 'remove'});

        pRemove.mFulfillToValue(undefined);

        assert.isTrue(stubContainer.classList.add.calledWith('empty'));
      });

      test('still unlocks CloseLock after rejection from model', function(){
        pDialog.mFulfillToValue({action: 'remove'});

        assert.isTrue(app.closeLockManager.requestLock.calledWith('stayAwake'));

        pRemove.mRejectToError();

        assert.isTrue(closeLock.unlock.called);
      });
    });

    suite('submitted dialog for replace', function() {
      var pReplace;
      var closeLock;

      setup(function(){
        pReplace = new MockPromise();
        closeLock = this.sinon.stub(new CloseLock());

        app.closeLockManager.requestLock.returns(closeLock);

        stubUserDictionary.updateWord.returns(pReplace);

        panel._showEditDialog(stubWordElem);
      });

      test('newWord is empty (do nothing)', function(){
        pDialog.mFulfillToValue({action: 'commit', word: '    \t   '});

        assert.isFalse(
          app.closeLockManager.requestLock.calledWith('stayAwake'));
        assert.isFalse(stubUserDictionary.updateWord.called);
      });

      test('newWord == oldWord (do nothing)', function(){
        pDialog.mFulfillToValue({action: 'commit', word: 'star'});

        assert.isFalse(
          app.closeLockManager.requestLock.calledWith('stayAwake'));
        assert.isFalse(stubUserDictionary.updateWord.called);
      });

      test('successful, new word does not exist yet', function(){
        var stubRearrangeList= this.sinon.stub(panel, '_rearrangeList');

        pDialog.mFulfillToValue({action: 'commit', word: 'star2'});

        assert.isTrue(app.closeLockManager.requestLock.calledWith('stayAwake'));
        assert.isTrue(
          stubUserDictionary.updateWord.calledWith('star', 'star2'));

        pReplace.mFulfillToValue(['star2']);

        assert.isTrue(closeLock.unlock.called);
        assert.equal(panel._domWordMap.get(stubWordElem), 'star2');
        assert.equal(stubWordElem.childNodes[0].textContent, 'star2');

        assert.isTrue(stubRearrangeList.calledWith(['star2']));
      });

      test('successful, new word already exists', function(){
        pDialog.mFulfillToValue({action: 'commit', word: 'star2'});

        pReplace.mRejectToError('existing');

        assert.isFalse(panel._domWordMap.has(stubWordElem));
        assert.isTrue(stubListContainer.removeChild.calledWith(stubWordElem));
      });

      test('still unlocks CloseLock after rejection from model', function(){
        pDialog.mFulfillToValue({action: 'commit', word: 'star2'});

        assert.isTrue(app.closeLockManager.requestLock.calledWith('stayAwake'));

        pReplace.mRejectToError();

        assert.isTrue(closeLock.unlock.called);
      });
    });
  });
});
