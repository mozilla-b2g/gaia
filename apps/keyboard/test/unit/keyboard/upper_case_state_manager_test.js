'use strict';

/* global UpperCaseStateManager */

require('/js/keyboard/upper_case_state_manager.js');

suite('UpperCaseStateManager', function() {
  var manager;

  setup(function() {
    manager = new UpperCaseStateManager();
    manager.onstatechange = this.sinon.stub();
    manager.start();
  });

  suite('isUpperCase = false, isUpperCaseLocked = false', function() {
    test('set isUpperCase = true', function() {
      manager.switchUpperCaseState({
        isUpperCase: true
      });

      assert.isTrue(manager.isUpperCase);
      assert.isFalse(manager.isUpperCaseLocked);
      assert.isTrue(manager.onstatechange.calledOnce);
    });

    test('set isUpperCase = false', function() {
      manager.switchUpperCaseState({
        isUpperCase: false
      });

      assert.isFalse(manager.isUpperCase);
      assert.isFalse(manager.isUpperCaseLocked);
      assert.isFalse(manager.onstatechange.calledOnce);
    });

    test('set isUpperCase = true, isUpperCaseLocked = false', function() {
      manager.switchUpperCaseState({
        isUpperCase: true,
        isUpperCaseLocked: false
      });

      assert.isTrue(manager.isUpperCase);
      assert.isFalse(manager.isUpperCaseLocked);
      assert.isTrue(manager.onstatechange.calledOnce);
    });

    test('set isUpperCase = false, isUpperCaseLocked = false', function() {
      manager.switchUpperCaseState({
        isUpperCase: false,
        isUpperCaseLocked: false
      });

      assert.isFalse(manager.isUpperCase);
      assert.isFalse(manager.isUpperCaseLocked);
      assert.isFalse(manager.onstatechange.calledOnce);
    });

    test('set isUpperCase = true, isUpperCaseLocked = true', function() {
      manager.switchUpperCaseState({
        isUpperCase: true,
        isUpperCaseLocked: true
      });

      assert.isTrue(manager.isUpperCase);
      assert.isTrue(manager.isUpperCaseLocked);
      assert.isTrue(manager.onstatechange.calledOnce);
    });

    test('set isUpperCase = false, isUpperCaseLocked = true', function() {
      manager.switchUpperCaseState({
        isUpperCase: false,
        isUpperCaseLocked: true
      });

      assert.isTrue(manager.isUpperCase);
      assert.isTrue(manager.isUpperCaseLocked);
      assert.isTrue(manager.onstatechange.calledOnce);
    });

    test('set isUpperCaseLocked = true', function() {
      manager.switchUpperCaseState({
        isUpperCaseLocked: true
      });

      assert.isTrue(manager.isUpperCase);
      assert.isTrue(manager.isUpperCaseLocked);
      assert.isTrue(manager.onstatechange.calledOnce);
    });

    test('set isUpperCaseLocked = false', function() {
      manager.switchUpperCaseState({
        isUpperCaseLocked: false
      });

      assert.isFalse(manager.isUpperCase);
      assert.isFalse(manager.isUpperCaseLocked);
      assert.isFalse(manager.onstatechange.calledOnce);
    });
  });

  suite('isUpperCase = true, isUpperCaseLocked = false', function() {
    setup(function() {
      manager.isUpperCase = true;
    });

    test('set isUpperCase = true', function() {
      manager.switchUpperCaseState({
        isUpperCase: true
      });

      assert.isTrue(manager.isUpperCase);
      assert.isFalse(manager.isUpperCaseLocked);
      assert.isFalse(manager.onstatechange.calledOnce);
    });

    test('set isUpperCase = false', function() {
      manager.switchUpperCaseState({
        isUpperCase: false
      });

      assert.isFalse(manager.isUpperCase);
      assert.isFalse(manager.isUpperCaseLocked);
      assert.isTrue(manager.onstatechange.calledOnce);
    });

    test('set isUpperCase = true, isUpperCaseLocked = false', function() {
      manager.switchUpperCaseState({
        isUpperCase: true,
        isUpperCaseLocked: false
      });

      assert.isTrue(manager.isUpperCase);
      assert.isFalse(manager.isUpperCaseLocked);
      assert.isFalse(manager.onstatechange.calledOnce);
    });

    test('set isUpperCase = false, isUpperCaseLocked = false', function() {
      manager.switchUpperCaseState({
        isUpperCase: false,
        isUpperCaseLocked: false
      });

      assert.isFalse(manager.isUpperCase);
      assert.isFalse(manager.isUpperCaseLocked);
      assert.isTrue(manager.onstatechange.calledOnce);
    });

    test('set isUpperCase = true, isUpperCaseLocked = true', function() {
      manager.switchUpperCaseState({
        isUpperCase: true,
        isUpperCaseLocked: true
      });

      assert.isTrue(manager.isUpperCase);
      assert.isTrue(manager.isUpperCaseLocked);
      assert.isTrue(manager.onstatechange.calledOnce);
    });

    test('set isUpperCase = false, isUpperCaseLocked = true', function() {
      manager.switchUpperCaseState({
        isUpperCase: false,
        isUpperCaseLocked: true
      });

      assert.isTrue(manager.isUpperCase);
      assert.isTrue(manager.isUpperCaseLocked);
      assert.isTrue(manager.onstatechange.calledOnce);
    });

    test('set isUpperCaseLocked = true', function() {
      manager.switchUpperCaseState({
        isUpperCaseLocked: true
      });

      assert.isTrue(manager.isUpperCase);
      assert.isTrue(manager.isUpperCaseLocked);
      assert.isTrue(manager.onstatechange.calledOnce);
    });

    test('set isUpperCaseLocked = false', function() {
      manager.switchUpperCaseState({
        isUpperCaseLocked: false
      });

      assert.isTrue(manager.isUpperCase);
      assert.isFalse(manager.isUpperCaseLocked);
      assert.isFalse(manager.onstatechange.calledOnce);
    });
  });

  suite('isUpperCase = true, isUpperCaseLocked = true', function() {
    setup(function() {
      manager.isUpperCase = true;
      manager.isUpperCaseLocked = true;
    });

    test('set isUpperCase = true', function() {
      manager.switchUpperCaseState({
        isUpperCase: true
      });

      assert.isTrue(manager.isUpperCase);
      assert.isTrue(manager.isUpperCaseLocked);
      assert.isFalse(manager.onstatechange.calledOnce);
    });

    test('set isUpperCase = false', function() {
      manager.switchUpperCaseState({
        isUpperCase: false
      });

      assert.isTrue(manager.isUpperCase);
      assert.isTrue(manager.isUpperCaseLocked);
      assert.isFalse(manager.onstatechange.calledOnce);
    });

    test('set isUpperCase = true, isUpperCaseLocked = false', function() {
      manager.switchUpperCaseState({
        isUpperCase: true,
        isUpperCaseLocked: false
      });

      assert.isTrue(manager.isUpperCase);
      assert.isFalse(manager.isUpperCaseLocked);
      assert.isTrue(manager.onstatechange.calledOnce);
    });

    test('set isUpperCase = false, isUpperCaseLocked = false', function() {
      manager.switchUpperCaseState({
        isUpperCase: false,
        isUpperCaseLocked: false
      });

      assert.isFalse(manager.isUpperCase);
      assert.isFalse(manager.isUpperCaseLocked);
      assert.isTrue(manager.onstatechange.calledOnce);
    });

    test('set isUpperCase = true, isUpperCaseLocked = true', function() {
      manager.switchUpperCaseState({
        isUpperCase: true,
        isUpperCaseLocked: true
      });

      assert.isTrue(manager.isUpperCase);
      assert.isTrue(manager.isUpperCaseLocked);
      assert.isFalse(manager.onstatechange.calledOnce);
    });

    test('set isUpperCase = false, isUpperCaseLocked = true', function() {
      manager.switchUpperCaseState({
        isUpperCase: false,
        isUpperCaseLocked: true
      });

      assert.isTrue(manager.isUpperCase);
      assert.isTrue(manager.isUpperCaseLocked);
      assert.isFalse(manager.onstatechange.calledOnce);
    });

    test('set isUpperCaseLocked = true', function() {
      manager.switchUpperCaseState({
        isUpperCaseLocked: true
      });

      assert.isTrue(manager.isUpperCase);
      assert.isTrue(manager.isUpperCaseLocked);
      assert.isFalse(manager.onstatechange.calledOnce);
    });

    test('set isUpperCaseLocked = false', function() {
      manager.switchUpperCaseState({
        isUpperCaseLocked: false
      });

      assert.isTrue(manager.isUpperCase);
      assert.isFalse(manager.isUpperCaseLocked);
      assert.isTrue(manager.onstatechange.calledOnce);
    });
  });
});
