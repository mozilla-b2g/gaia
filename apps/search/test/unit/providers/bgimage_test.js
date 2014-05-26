'use strict';
/* global Search, eme, Promise, MockNavigatorSettings */

requireApp('search/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('search/shared/js/settings_listener.js');
requireApp('search/shared/js/everythingme/eme.js');
requireApp('search/shared/js/everythingme/api.js');
requireApp('search/test/unit/mock_search.js');
requireApp('search/js/providers/provider.js');
requireApp('search/js/providers/bgimage.js');

suite('search/providers/bgimage', function() {

  var fakeElement, stubById, subject, realSettings;

  setup(function(done) {
    realSettings = navigator.mozSettings;
    navigator.mozSettings = MockNavigatorSettings;

    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    requireApp('search/js/providers/bgimage.js', function() {
      subject = Search.providers.BGImage;
      subject.init();
      done();
    });
  });

  teardown(function() {
    navigator.mozSettings = realSettings;
    stubById.restore();
  });

  suite('init', function() {
    test('calls eme.init', function() {
      var emeStub = this.sinon.stub(eme, 'init');
      subject.init();
      assert.ok(emeStub);
    });
  });

  suite('search', function() {
    test('calls clear', function() {
      var clearStub = this.sinon.stub(subject, 'clear');
      subject.search();
      assert.ok(clearStub.calledOnce);
    });
  });

  suite('clear', function() {
    test('removes styles', function() {
      document.body.classList.add('bgimage');
      document.body.style.backgroundImage = 'url(foo)';
      subject.clear();
      assert.equal(document.body.style.backgroundImage, '');
      assert.ok(!document.body.classList.contains('bgimage'));
    });
  });

  suite('fetchImage', function() {
    function promise() {
      return new Promise(function done() {});
    }

    setup(function() {
      eme.api = {
        Search: {
          bgimage: function() {
            return promise();
          }
        }
      };
    });

    test('calls clear', function() {
      var clearStub = this.sinon.stub(subject, 'clear');
      subject.search();
      assert.ok(clearStub.calledOnce);
    });

    test('calls clear', function() {
      var clearStub = this.sinon.stub(subject, 'clear');
      subject.search();
      assert.ok(clearStub.calledOnce);
    });

    test('make api call', function() {
      var stub = this.sinon.stub(eme.api.Search, 'bgimage');
      stub.returns(promise());
      subject.fetchImage();
      assert.ok(stub.calledOnce);
    });
  });
});
