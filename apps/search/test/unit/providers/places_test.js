/* global MockNavigatorDatastore, MockDatastore, Search */
'use strict';

require('/shared/test/unit/mocks/mock_navigator_datastore.js');
require('/shared/js/utilities.js');
requireApp('search/test/unit/mock_search.js');
requireApp('search/test/unit/mock_googlelink.js');
requireApp('search/js/providers/provider.js');

suite('search/providers/places', function() {
  var fakeElement, stubById, subject;
  var realDatastore;

  suiteSetup(function() {
    realDatastore = navigator.getDataStores;
    navigator.getDataStores = MockNavigatorDatastore.getDataStores;
    MockNavigatorDatastore._records = {};

    window.SettingsListener = {
      observe: function() {}
    };

    MockDatastore.sync = function() {
      var cursor = {
        next: function() {
          cursor.next = function() {};
          return new window.Promise(function(resolve, reject) {
            resolve({
              operation: 'add',
              data: {
                url: 'http://mozilla.org',
                title: 'homepage'
              }
            });
          });
        }
      };
      return cursor;
    };
  });

  suiteTeardown(function() {
    navigator.getDataStores = realDatastore;
    delete window.SettingsListener;
  });

  setup(function(done) {
    fakeElement = document.createElement('div');
    fakeElement.style.cssText = 'height: 100px; display: block;';
    stubById = this.sinon.stub(document, 'getElementById')
                          .returns(fakeElement.cloneNode(true));
    requireApp('search/js/providers/places.js', function() {
      subject = window.Places;
      subject.init();
      done();
    });
  });

  teardown(function() {
    stubById.restore();
  });

  suite('search', function() {
    test('calls clear', function() {
      var stub = this.sinon.stub(subject, 'clear');
      subject.search('foo', function() {});
      assert.ok(stub.calledOnce);
    });

    test('renders data url', function() {
      subject.search('mozilla', Search.collect.bind(Search, subject));

      var place = subject.container.querySelector('.result');
      assert.equal(place.dataset.url, 'http://mozilla.org');
      assert.equal(place.querySelector('.title').innerHTML, 'homepage');
      assert.equal(place.getAttribute('aria-label'), 'homepage');
      assert.equal(place.getAttribute('role'), 'link');
      assert.equal(place.querySelector('.icon').getAttribute('role'),
        'presentation');
    });
  });

});
