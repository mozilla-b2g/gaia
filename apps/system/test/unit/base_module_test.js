/* global BaseModule, MocksHelper, MockSystem, MockLazyLoader */
'use strict';

require('/shared/test/unit/mocks/mock_system.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');

var mocksForBaseModule = new MocksHelper([
  'LazyLoader', 'System'
]).init();

suite('system/BaseModule', function() {
  mocksForBaseModule.attachTestHelpers();

  setup(function(done) {
    requireApp('system/js/base_module.js', done);
  });

  test('start', function() {
    var a = new BaseModule();
    a.start();
  });

  test('Settings observer', function() {
    var A = function() {};
    A.SETTINGS = ['b.enabled', 'c.disabled'];
    A.prototype = Object.create(BaseModule.prototype);
    A.prototype.constructor = A;
    A.prototype.name = 'SettingTester';
    var stubAddObserver = this.sinon.stub(MockSystem, 'addObserver');
    var a = new A();
    a.start();
    assert.equal(stubAddObserver.getCall(0).args[0], 'b.enabled');
    assert.deepEqual(stubAddObserver.getCall(0).args[1], a);
    assert.equal(stubAddObserver.getCall(1).args[0], 'c.disabled');
    assert.deepEqual(stubAddObserver.getCall(1).args[1], a);
  });

  test('Event handler', function() {
    var A = function() {};
    A.EVENTS = ['b', 'c'];
    A.prototype = Object.create(BaseModule.prototype);
    A.prototype.constructor = A;
    A.prototype.name = 'EventTester';
    var get_b = false;
    A.prototype._handle_b = function() {
      get_b = true;
    };
    var get_c = false;
    A.prototype._handle_c = function() {
      get_c = true;
    };
    var a = new A();
    assert.isFalse(get_b);
    assert.isFalse(get_c);
    a.start();
    assert.isFalse(get_b);
    assert.isFalse(get_c);
    window.dispatchEvent(new CustomEvent('b'));
    assert.isTrue(get_b);
    window.dispatchEvent(new CustomEvent('c'));
    assert.isTrue(get_c);
  });

  test('Sub modules', function() {
    var A = function() {};
    A.SUB_MODULES = ['BModule'];
    A.prototype = Object.create(BaseModule.prototype);
    A.prototype.constructor = A;
    A.prototype.name = 'SubmoduleTester';
    var a = new A();
    var stubLazyLoad = this.sinon.stub(MockSystem, 'lazyLoad');
    a.start();
    assert.isTrue(stubLazyLoad.called);
    window.BModule = function() {};
    this.sinon.stub(MockSystem, 'lowerCapital').returns('b');
    stubLazyLoad.yield();
    assert.isDefined(a.b);
  });

  test('Imports', function() {
    var A = function() {};
    A.IMPORTS = ['BModule', 'CModule'];
    A.prototype = Object.create(BaseModule.prototype);
    A.prototype.constructor = A;
    A.prototype.name = 'ImportTester';
    var a = new A();
    var stubLoad = this.sinon.stub(MockLazyLoader, 'load');
    var stubOnImported = this.sinon.stub(a, '__onImported');
    a.start();
    assert.isTrue(stubLoad.called);
    stubLoad.yield();
    assert.isTrue(stubOnImported.called);
  });
});
