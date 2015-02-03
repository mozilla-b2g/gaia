'use strict';
/* global Provider, MocksHelper */

requireApp('search/shared/js/everythingme/eme.js');
requireApp('search/js/providers/provider.js');
require('/shared/test/unit/mocks/mock_icons_helper.js');

var mocks = new MocksHelper([
  'IconsHelper'
]).init();

suite('search/providers/provider', function() {

  var fakeElement, stubById, subject;
  mocks.attachTestHelpers();

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

  suite('render', function() {
    test('escapes HTML', function() {
      subject.init();
      subject.render([{
        title: '<hello>',
        meta: '<world>',
        dataset: {}
      }]);

      var title = subject.container.querySelector('.title');
      assert.equal(title.innerHTML, '&lt;hello&gt;');

      var meta = subject.container.querySelector('.meta');
      assert.equal(meta.innerHTML, '&lt;world&gt;');
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
