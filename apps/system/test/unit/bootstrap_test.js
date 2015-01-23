'use strict';
/* global BaseModule */

requireApp('system/shared/js/performance_testing_helper.js');
requireApp('system/shared/js/usertiming.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/bootstrap.js');

suite('system/Bootstrap', function() {
  test('Should launch core after load', function() {
    var MockCore = {
      start: this.sinon.spy()
    };
    this.sinon.stub(BaseModule, 'instantiate').returns(MockCore);
    window.dispatchEvent(new CustomEvent('load'));
    assert.isTrue(MockCore.start.called);
  });
});
