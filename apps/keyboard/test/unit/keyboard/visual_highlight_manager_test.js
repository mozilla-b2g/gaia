'use strict';

/* global VisualHighlightManager */

require('/js/keyboard/visual_highlight_manager.js');

suite('VisualHighlightManager', function() {
  var app;
  var manager;
  var target;

  setup(function() {
    app = {
      isCapitalized: this.sinon.stub()
    };

    // Create fake IMERender
    window.IMERender = {
      highlightKey: this.sinon.stub(),
      unHighlightKey: this.sinon.stub()
    };

    target = {};

    manager = new VisualHighlightManager(app);
    manager.start();

    this.sinon.stub(window, 'setTimeout');
    this.sinon.stub(window, 'clearTimeout');
  });

  teardown(function() {
    window.IMERender = null;
    app = null;
  });

  test('show (lower case)', function() {
    app.isCapitalized.returns(false);
    manager.show(target);

    assert.isTrue(window.IMERender.highlightKey
      .calledWith(target, { showUpperCase: false }));
  });

  test('show (upper case)', function() {
    app.isCapitalized.returns(true);
    manager.show(target);

    assert.isTrue(window.IMERender.highlightKey
      .calledWith(target, { showUpperCase: true }));
  });

  test('show after hide', function() {
    manager.hide(target);

    var target2 = {};

    app.isCapitalized.returns(false);
    manager.show(target2);

    assert.isTrue(window.IMERender.unHighlightKey.calledWith(target),
      'The first target highlight should be hidden immediately.');

    assert.isTrue(window.IMERender.highlightKey
      .calledWith(target2, { showUpperCase: false }));
  });

  test('hide', function() {
    manager.hide(target);

    assert.isTrue(window.setTimeout.calledOnce);
    assert.equal(window.setTimeout.getCall(0).args[1],
      manager.HIGHTLIGHT_DELAY_MS);

    window.setTimeout.getCall(0).args[0].call(window);

    assert.isTrue(window.IMERender.unHighlightKey.calledWith(target));
  });

  test('hide twice within HIGHTLIGHT_DELAY_MS', function() {
    window.setTimeout.returns(200);

    manager.hide(target);

    assert.isTrue(window.setTimeout.calledOnce);
    assert.equal(window.setTimeout.getCall(0).args[1],
      manager.HIGHTLIGHT_DELAY_MS);

    window.setTimeout.returns(201);

    manager.hide(target);

    assert.isTrue(window.clearTimeout.calledWith(200));
    assert.isTrue(window.setTimeout.calledTwice);

    window.setTimeout.getCall(1).args[0].call(window);

    assert.isTrue(window.IMERender.unHighlightKey.calledWith(target));
  });
});
