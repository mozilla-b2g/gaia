'use strict';

/* global VisualHighlightManager */

require('/js/keyboard/visual_highlight_manager.js');

suite('VisualHighlightManager', function() {
  var app;
  var manager;
  var target;
  var viewManager;

  setup(function() {
    // Create fake viewManager
    viewManager = {
      highlightKey: this.sinon.stub(),
      unHighlightKey: this.sinon.stub()
    };

    app = {
      viewManager: viewManager
    };

    target = {};

    manager = new VisualHighlightManager(app);
    manager.start();

    this.sinon.stub(window, 'setTimeout');
    this.sinon.stub(window, 'clearTimeout');
  });

  teardown(function() {
    app = null;
  });

  test('show', function() {
    manager.show(target);

    assert.isTrue(viewManager.highlightKey.calledWith(target));
  });

  test('show after hide', function() {
    manager.hide(target);

    var target2 = {};

    manager.show(target2);

    assert.isTrue(viewManager.unHighlightKey.calledWith(target),
      'The first target highlight should be hidden immediately.');

    assert.isTrue(viewManager.highlightKey.calledWith(target2));
  });

  test('hide', function() {
    manager.hide(target);

    assert.isTrue(window.setTimeout.calledOnce);
    assert.equal(window.setTimeout.getCall(0).args[1],
      manager.HIGHTLIGHT_DELAY_MS);

    window.setTimeout.getCall(0).args[0].call(window);

    assert.isTrue(viewManager.unHighlightKey.calledWith(target));
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

    assert.isTrue(viewManager.unHighlightKey.calledWith(target));
  });
});
