'use strict';

/* global PanelController, DialogController, MockPromise, BaseView,
          GeneralPanel, UserDictionaryListPanel, UserDictionaryEditDialog */

require('/js/settings/base_view.js');
require('/js/settings/general_panel.js');
require('/js/settings/user_dictionary_list_panel.js');
require('/js/settings/user_dictionary_edit_dialog.js');
require('/js/settings/panel_controller.js');
require('/shared/test/unit/mocks/mock_promise.js');

suite('PanelController', function() {
  var controller;
  var stubGeneralPanel;
  var stubUserDictionaryListPanel;
  var app;
  var panel;
  var options;
  var stubCreateTransitionPromise;

  setup(function() {
    stubGeneralPanel = this.sinon.stub(Object.create(GeneralPanel.prototype));

    stubUserDictionaryListPanel =
      this.sinon.stub(Object.create(UserDictionaryListPanel.prototype));
    this.sinon.stub(window, 'UserDictionaryListPanel')
      .returns(stubUserDictionaryListPanel);

    panel = {
      beforeShow: this.sinon.stub().returns('promisePBeforeShow'),
      show: this.sinon.stub().returns('promisePShow'),
      beforeHide: this.sinon.stub().returns('promisePBeforeHide'),
      hide: this.sinon.stub().returns('promisePHide'),
      container: document.createElement('div')
    };

    stubGeneralPanel.beforeShow.returns('promiseGBeforeShow');
    stubGeneralPanel.show.returns('promiseGShow');
    stubGeneralPanel.beforeHide.returns('promiseGBeforeHide');
    stubGeneralPanel.hide.returns('promiseGHide');

    app = {};

    options = {};

    this.sinon.stub(window, 'Promise', MockPromise);
    this.sinon.spy(window.Promise, 'resolve');

    controller = new PanelController(app);
    this.sinon.stub(controller, 'RootPanelClass').returns(stubGeneralPanel);
    controller.start();

    // test for start()
    assert.isTrue(stubGeneralPanel.start.called);

    // test for subcomponent constructors
    assert.isTrue(controller.RootPanelClass.calledWith(app));

    // start(): Promise.resolve <----> 1st .then()
    assert.isTrue(controller.rootPanel.beforeShow.calledOnce);
    assert.isTrue(window.Promise.resolve.calledWith('promiseGBeforeShow'));

    // start(): 1st .then() onwards
    var p1 = window.Promise.resolve.firstCall.returnValue;
    var val1 = p1.mFulfillToValue(undefined);

    assert.equal(val1, 'promiseGShow');

    assert.isTrue(controller.rootPanel.show.calledOnce);


    // reset some stubbed calls so the actual test cases aren't affected
    window.Promise.resolve.reset();
    controller.rootPanel.beforeShow.reset();
    controller.rootPanel.show.reset();


    controller.rootPanel.container = document.createElement('div');

    stubCreateTransitionPromise =
      this.sinon.stub(controller, '_createTransitionPromise')
      .returns('promiseTransition');
  });

  teardown(function() {
    controller.stop();

    assert.isTrue(stubUserDictionaryListPanel.stop.called);
    assert.isTrue(stubGeneralPanel.stop.called);
  });

  test('alternative RootPanelClass', function(){
    var AlternativeClass = function(){};
    AlternativeClass.prototype =
      this.sinon.stub(Object.create(BaseView.prototype));

    var controller2 = new PanelController(app, AlternativeClass);

    controller2.start(app);

    assert.isTrue(AlternativeClass.prototype.start.called,
      'start of AlternativeClass should be called');
  });

  test('navigateToPanel', function() {
    controller.navigateToPanel(panel, options);

    // Promise.resolve <----> 1st .then()
    assert.isTrue(controller.rootPanel.beforeHide.called);

    assert.isTrue(window.Promise.resolve.calledWith('promiseGBeforeHide'));

    // 1st .then() <----> 2nd .then()
    var p1 = window.Promise.resolve.firstCall.returnValue;
    var val1 = p1.mFulfillToValue(undefined);

    assert.isTrue(panel.beforeShow.calledWith(options));

    assert.equal(val1, 'promisePBeforeShow');

    // 2nd .then() <----> 3rd .then()
    var p2 = p1.mGetNextPromise();
    var val2 = p2.mFulfillToValue(undefined);

    assert.equal(val2, 'promiseTransition');

    assert.isTrue(stubCreateTransitionPromise.calledWith(panel.container));

    assert.isTrue(panel.container.classList.contains('current'));
    assert.isTrue(controller.rootPanel.container.classList.contains('prev'));
    assert.isFalse(
      controller.rootPanel.container.classList.contains('current'));

    // 3rd .then() <----> 4th .then()
    var p3 = p2.mGetNextPromise();
    var val3 = p3.mFulfillToValue(undefined);

    assert.isTrue(controller.rootPanel.hide.calledOnce);
    assert.equal(val3, 'promiseGHide');

    // 4th .then() onwards
    var p4 = p3.mGetNextPromise();
    var val4 = p4.mFulfillToValue(undefined);

    assert.isTrue(panel.show.calledOnce);
    assert.equal(val4, 'promisePShow');
  });

  test('navigateToRoot', function() {
    controller._currentPanel = panel;

    controller.navigateToRoot();

    // Promise.resolve <----> 1st .then()
    assert.isTrue(controller._currentPanel.beforeHide.called);

    assert.isTrue(window.Promise.resolve.calledWith('promisePBeforeHide'));

    // 1st .then() <----> 2nd .then()
    var p1 = window.Promise.resolve.firstCall.returnValue;
    var val1 = p1.mFulfillToValue(undefined);

    assert.isTrue(controller.rootPanel.beforeShow.calledOnce);

    assert.equal(val1, 'promiseGBeforeShow');

    // 2nd .then() <----> 3rd .then()
    var p2 = p1.mGetNextPromise();
    var val2 = p2.mFulfillToValue(undefined);

    assert.equal(val2, 'promiseTransition');

    assert.isTrue(stubCreateTransitionPromise.calledWith(panel.container));

    assert.isFalse(panel.container.classList.contains('current'));
    assert.isFalse(controller.rootPanel.container.classList.contains('prev'));
    assert.isTrue(
      controller.rootPanel.container.classList.contains('current'));

    // 3rd .then() <----> 4th .then()
    var p3 = p2.mGetNextPromise();
    var val3 = p3.mFulfillToValue(undefined);

    assert.isTrue(controller._currentPanel.hide.calledOnce);
    assert.equal(val3, 'promisePHide');

    // 4th .then() onwards
    var p4 = p3.mGetNextPromise();
    var val4 = p4.mFulfillToValue(undefined);

    assert.isTrue(controller.rootPanel.show.calledOnce);
    assert.equal(val4, 'promiseGShow');
  });
});

suite('DialogController', function() {
  var stubUserDictionaryEditDialog;
  var controller;
  var dialog;
  var options;
  var stubCreateTransitionPromise;

  setup(function() {
    stubUserDictionaryEditDialog =
      this.sinon.stub(Object.create(UserDictionaryEditDialog.prototype));
    this.sinon.stub(window, 'UserDictionaryEditDialog')
      .returns(stubUserDictionaryEditDialog);

    dialog = {
      beforeShow: this.sinon.stub().returns('promiseDBeforeShow'),
      show: this.sinon.stub().returns('promiseDShow'),
      beforeHide: this.sinon.stub().returns('promiseDBeforeHide'),
      hide: this.sinon.stub().returns('promiseDHide'),
      onsubmit: undefined,
      container: document.createElement('div')
    };

    options = {};

    this.sinon.stub(window, 'Promise', MockPromise);
    this.sinon.spy(window.Promise, 'resolve');

    controller = new DialogController();
    controller.start();

    stubCreateTransitionPromise =
      this.sinon.stub(controller, '_createTransitionPromise')
      .returns('promiseTransition');
  });

  teardown(function() {
    controller.stop();

    assert.isTrue(stubUserDictionaryEditDialog.stop.called);
  });

  suite('openDialog with a dialog', function() {
    var resultPromise; // openDialog's returned Promise
    var resResolve; // openDialog's internal resolve/reject func from Promise
    var resReject;

    setup(function() {
      resultPromise = controller.openDialog(dialog, options);

      var pResult = window.Promise.firstCall.returnValue;
      resResolve = this.sinon.spy();
      resReject = this.sinon.spy();

      pResult.mExecuteCallback(resResolve, resReject);
    });

    test('normal flow', function() {
      // Promise.resolve <----> 1st .then()

      assert.isTrue(dialog.beforeShow.calledWith(options));

      assert.isTrue(window.Promise.resolve.calledWith('promiseDBeforeShow'));

      // 1st .then() <----> 2nd .then()
      var p1 = window.Promise.resolve.firstCall.returnValue;
      var val1 = p1.mFulfillToValue(undefined);
      assert.equal(val1, 'promiseTransition');

      assert.isTrue(stubCreateTransitionPromise.calledWith(dialog.container));

      assert.isTrue(dialog.container.classList.contains('displayed'));


      // 2nd .then() onwards
      var p2 = p1.mGetNextPromise();
      var val2 = p2.mFulfillToValue(undefined);

      assert.isTrue(dialog.show.calledOnce);
      assert.equal(val2, 'promiseDShow');

      // inside onsubmit

      stubCreateTransitionPromise.reset();

      var results = {};
      dialog.onsubmit(results);

      assert.isTrue(resResolve.calledWith(results));

      // Promise.resolve <-----> 1st .then(), inside onsubmit
      assert.isTrue(
        window.Promise.resolve.secondCall.calledWith('promiseDBeforeHide')
      );

      // 1st .then() <----> 2nd .then(), inside onsubmit
      var pS1 = window.Promise.resolve.secondCall.returnValue;
      var valS1 = pS1.mFulfillToValue(undefined);
      assert.equal(valS1, 'promiseTransition');

      assert.isTrue(stubCreateTransitionPromise.calledWith(dialog.container));

      assert.isFalse(dialog.container.classList.contains('displayed'));


      // 2nd .then() onwards, inside onsubmit
      var pS2 = pS1.mGetNextPromise();
      var valS2 = pS2.mFulfillToValue(undefined);
      assert.strictEqual(dialog.onsubmit, undefined);

      assert.equal(valS2, 'promiseDHide');
    });

    test('exception flow', function() {
      // Promise.resolve <----> 1st .then()

      var p1 = window.Promise.resolve.firstCall.returnValue;
      var p2 = p1.mGetNextPromise();

      p1.mRejectToError('error1');
      assert.isTrue(resReject.calledWith('error1'));

      resReject.reset();

      p2.mRejectToError('error2');
      assert.isTrue(resReject.calledWith('error2'));
    });
  });

  test('openDialog argument not having onsubmit', function() {
    this.sinon.spy(window.Promise, 'reject');

    controller.openDialog({});

    assert.isTrue(window.Promise.reject.calledWith(
      'Dialog does not have a onsubmit callback'));
  });
});

