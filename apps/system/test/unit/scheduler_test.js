/* global BaseModule */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/scheduler.js');

suite('system/scheduler', function() {
  var subject;

  setup(function() {
    subject = BaseModule.instantiate('Scheduler');
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  test('Should hold the operations until released', function() {
    var spy1 = this.sinon.spy();
    var spy2 = this.sinon.spy();
    subject.schedule(spy1);
    subject.schedule(spy2);
    assert.isFalse(spy1.called);
    assert.isFalse(spy2.called);

    subject.release();
    assert.isTrue(spy1.called);
    assert.isTrue(spy2.called);
  });

  test('Should proceed the operations if it is not blocking now', function() {
    var spy1 = this.sinon.spy();
    var spy2 = this.sinon.spy();
    subject.release();
    subject.schedule(spy1);
    subject.schedule(spy2);

    assert.isTrue(spy1.called);
    assert.isTrue(spy2.called);
  });
});