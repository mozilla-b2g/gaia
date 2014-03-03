'use strict';
/* global Provider */

requireApp('search/js/eme/eme.js');
requireApp('search/js/providers/provider.js');

suite('search/providers/provider', function() {

  var fakeElement, stubById, subject;

  setup(function() {
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    subject = new Provider();
  });

  teardown(function() {
    stubById.restore();
  });

  suite('constructor', function() {
    test('everything looks ok', function() {
      assert.ok(subject.name);
    });
  });

  suite('init', function() {
    test('sets up container', function() {
      subject.init();
      assert.ok(subject.container);
    });
  });

  suite('abort', function() {
    test('calls abort on the current request', function() {
      subject.request = {
        abort: function() {}
      };
      var stub = this.sinon.stub(subject.request, 'abort');
      subject.abort();
      assert.ok(stub.calledOnce);
    });
  });

  suite('clear', function() {
    test('clears container', function() {
      subject.init();
      subject.container.innerHTML = 'not empty';
      subject.clear();
      assert.equal(subject.container.innerHTML, '');
    });
  });

});
