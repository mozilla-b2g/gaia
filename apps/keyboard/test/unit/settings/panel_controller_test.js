'use strict';

/* global PanelController, DialogController, MockPromise */

require('/js/settings/panel_controller.js');
require('/shared/test/unit/mocks/mock_promise.js');

suite('PanelController', function() {
  var controller;
  var rootPanelElem;
  var panel;
  var options;
  var stubCreateTransitionPromise;

  setup(function() {
    rootPanelElem = document.createElement('div');

    panel = {
      beforeShow: this.sinon.stub().returns('promiseBeforeShow'),
      show: this.sinon.stub().returns('promiseShow'),
      beforeHide: this.sinon.stub().returns('promiseBeforeHide'),
      hide: this.sinon.stub().returns('promiseHide'),
      _container: document.createElement('div')
    };

    options = {};

    this.sinon.stub(window, 'Promise', MockPromise);
    this.sinon.spy(window.Promise, 'resolve');

    controller = new PanelController(rootPanelElem);
    controller.start();

    stubCreateTransitionPromise =
      this.sinon.stub(controller, '_createTransitionPromise')
      .returns('promiseTransition');
  });

  teardown(function() {
    controller.stop();
  });

  test('navigateToPanel', function() {
    controller.navigateToPanel(panel, options);

    // Promise.resolve <----> 1st .then()
    assert.isTrue(panel.beforeShow.calledWith(options));

    assert.isTrue(window.Promise.resolve.calledWith('promiseBeforeShow'));

    // 1st .then() <----> 2nd .then()
    var p1 = window.Promise.resolve.firstCall.returnValue;
    var val1 = p1.mFulfillToValue(undefined);
    assert.equal(val1, 'promiseTransition');

    assert.isTrue(stubCreateTransitionPromise.calledWith(panel._container));

    assert.isTrue(panel._container.classList.contains('current'));
    assert.isTrue(rootPanelElem.classList.contains('prev'));
    assert.isFalse(rootPanelElem.classList.contains('current'));


    // 2nd .then() onwards
    var p2 = p1.mGetNextPromise();
    var val2 = p2.mFulfillToValue(undefined);

    assert.isTrue(panel.show.calledOnce);
    assert.equal(val2, 'promiseShow');
  });

  test('navigateToRoot', function() {
    controller._currentPanel = panel;

    controller.navigateToRoot();

    // Promise.resolve <----> 1st .then()
    assert.isTrue(panel.beforeHide.calledOnce);

    assert.isTrue(window.Promise.resolve.calledWith('promiseBeforeHide'));

    // 1st .then() <----> 2nd .then()
    var p1 = window.Promise.resolve.firstCall.returnValue;
    var val1 = p1.mFulfillToValue(undefined);
    assert.equal(val1, 'promiseTransition');

    assert.isTrue(stubCreateTransitionPromise.calledWith(panel._container));

    assert.isFalse(panel._container.classList.contains('current'));
    assert.isFalse(rootPanelElem.classList.contains('prev'));
    assert.isTrue(rootPanelElem.classList.contains('current'));


    // 2nd .then() <----> 3rd .then()
    var p2 = p1.mGetNextPromise();
    var val2 = p2.mFulfillToValue(undefined);

    assert.isTrue(panel.hide.calledOnce);
    assert.equal(val2, 'promiseHide');


    // 3rd .then() onwards
    p2.mGetNextPromise().mFulfillToValue(undefined);

    assert.strictEqual(controller._currentPanel, null);
  });
});

suite('DialogController', function() {
  var controller;
  var dialog;
  var options;
  var stubCreateTransitionPromise;

  setup(function() {
    dialog = {
      beforeShow: this.sinon.stub().returns('promiseBeforeShow'),
      show: this.sinon.stub().returns('promiseShow'),
      beforeHide: this.sinon.stub().returns('promiseBeforeHide'),
      hide: this.sinon.stub().returns('promiseHide'),
      onsubmit: undefined,
      _container: document.createElement('div')
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

      assert.equal(options.dialogController, controller);

      assert.isTrue(dialog.beforeShow.calledWith(options));

      assert.isTrue(window.Promise.resolve.calledWith('promiseBeforeShow'));

      // 1st .then() <----> 2nd .then()
      var p1 = window.Promise.resolve.firstCall.returnValue;
      var val1 = p1.mFulfillToValue(undefined);
      assert.equal(val1, 'promiseTransition');

      assert.isTrue(stubCreateTransitionPromise.calledWith(dialog._container));

      assert.isTrue(dialog._container.classList.contains('displayed'));


      // 2nd .then() onwards
      var p2 = p1.mGetNextPromise();
      var val2 = p2.mFulfillToValue(undefined);

      assert.isTrue(dialog.show.calledOnce);
      assert.equal(val2, 'promiseShow');

      // inside onsubmit

      stubCreateTransitionPromise.reset();

      var results = {};
      dialog.onsubmit(results);

      assert.isTrue(resResolve.calledWith(results));

      // Promise.resolve <-----> 1st .then(), inside onsubmit
      assert.isTrue(
        window.Promise.resolve.secondCall.calledWith('promiseBeforeHide')
      );

      // 1st .then() <----> 2nd .then(), inside onsubmit
      var pS1 = window.Promise.resolve.secondCall.returnValue;
      var valS1 = pS1.mFulfillToValue(undefined);
      assert.equal(valS1, 'promiseTransition');

      assert.isTrue(stubCreateTransitionPromise.calledWith(dialog._container));

      assert.isFalse(dialog._container.classList.contains('displayed'));


      // 2nd .then() onwards, inside onsubmit
      var pS2 = pS1.mGetNextPromise();
      var valS2 = pS2.mFulfillToValue(undefined);
      assert.strictEqual(dialog.onsubmit, undefined);

      assert.equal(valS2, 'promiseHide');
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

