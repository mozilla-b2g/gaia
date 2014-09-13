'use strict';

/* global DownloadableList, Downloadable, DatabasePromiseManager,
          MockPromise */

require('/js/settings/downloadable.js');
require('/js/settings/downloadable_list.js');
require('/js/settings/database_promise_manager.js');
require('/shared/test/unit/mocks/mock_promise.js');

suite('DownloadableList', function() {
  var downloadableList;
  var stubDatabasePromiseManager;
  var fakeXhrs;

  var sectionEl;
  var listEl;
  var fakeJSONData;

  var p;

  setup(function() {
    this.sinon.stub(window, 'Promise', MockPromise);
    this.sinon.spy(window.Promise, 'all');

    stubDatabasePromiseManager =
      this.sinon.stub(DatabasePromiseManager.prototype);
    this.sinon.stub(window, 'DatabasePromiseManager')
      .returns(stubDatabasePromiseManager);

    var DownloadablePrototype = Downloadable.prototype;
    this.sinon.stub(window, 'Downloadable', function() {
      var stub = sinon.stub(Object.create(DownloadablePrototype));
      stub.element = document.createElement('li');

      return stub;
    });

    fakeXhrs = this.sinon.useFakeXMLHttpRequest();

    downloadableList = new DownloadableList();

    sectionEl = document.createElement('div');
    sectionEl.classList.add('hide');
    listEl = document.createElement('ul');
    this.sinon.stub(listEl, 'appendChild');

    this.sinon.stub(document, 'getElementById');
    document.getElementById
      .withArgs(downloadableList.SECTION_ELEMENT_ID).returns(sectionEl);
    document.getElementById
      .withArgs(downloadableList.LIST_ELEMENT_ID).returns(listEl);

    downloadableList.start();

    p = window.Promise.firstCall.returnValue;
  });

  test('failed to get the list', function(done) {
    p.mExecuteCallback(function resolve() {
      assert.isTrue(false, 'should not resolve');
    }, function reject() {
      p.mRejectToError();

      assert.isTrue(sectionEl.classList.contains('hide'),
        'sectionEl is still hidden');

      done();
    });

    var xhrRequest = fakeXhrs.requests[0];
    assert.equal(xhrRequest.url, downloadableList.DICT_FILE_PATH);
    assert.equal(xhrRequest.method, 'GET');
    assert.equal(xhrRequest.async, true);
    assert.equal(xhrRequest.responseType, 'json');

    xhrRequest.response = null;
    xhrRequest.respond(404, {}, '');
  });

  test('got a list with no downloadable data', function() {
    fakeJSONData = [
      {
        'label': 'English',
        'name': 'en_us',
        'preloaded': true
      },
      {
        'label': 'Español',
        'name': 'es',
        'preloaded': true
      },
      {
        'label': 'Ελληνικό',
        'name': 'el',
        'preloaded': true
      }
    ];

    var resolved = false;
    p.mExecuteCallback(function resolve(d) {
      assert.equal(d, fakeJSONData, 'should resolve with json');

      resolved = true;
    }, function reject() {
      assert.isTrue(false, 'should not resolve');
    });

    var xhrRequest = fakeXhrs.requests[0];
    assert.equal(xhrRequest.url, downloadableList.DICT_FILE_PATH);
    assert.equal(xhrRequest.method, 'GET');
    assert.equal(xhrRequest.async, true);
    assert.equal(xhrRequest.responseType, 'json');

    xhrRequest.response = fakeJSONData;
    xhrRequest.respond(200, {}, '');

    assert.isTrue(resolved, 'xhr should resolve with 200 response.');

    p.mFulfillToValue(fakeJSONData);

    assert.isTrue(sectionEl.classList.contains('hide'),
      'sectionEl is still hidden');
  });

  suite('got a list with downloadable data', function() {
    var pAll;
    setup(function() {
      fakeJSONData = [
        {
          'label': 'English',
          'name': 'en_us',
          'preloaded': true
        },
        {
          'label': 'Español',
          'name': 'es',
          'preloaded': false
        },
        {
          'label': 'Ελληνικό',
          'name': 'el',
          'preloaded': false
        }
      ];

      p.mExecuteCallback(function resolve(d) {
        assert.equal(d, fakeJSONData, 'should resolve with json');
      }, function reject() {
        assert.isTrue(false, 'should not resolve');
      });

      var xhrRequest = fakeXhrs.requests[0];
      assert.equal(xhrRequest.url, downloadableList.DICT_FILE_PATH);
      assert.equal(xhrRequest.method, 'GET');
      assert.equal(xhrRequest.async, true);
      assert.equal(xhrRequest.responseType, 'json');

      xhrRequest.response = fakeJSONData;
      xhrRequest.respond(200, {}, '');

      stubDatabasePromiseManager.getItems.returns({ getItems: '' });

      pAll = p.mFulfillToValue(fakeJSONData);
    });

    test('show the list with data, and getItems', function() {
      assert.isFalse(sectionEl.classList.contains('hide'),
        'sectionEl is not hidden');

      fakeJSONData.forEach(function(dict, i) {
        var call = window.Downloadable.getCall(i);
        assert.isTrue(!!call, 'called');

        var stub = call.returnValue;

        assert.isTrue(call.calledWith(stubDatabasePromiseManager, {
          label: dict.label,
          preloaded: dict.preloaded,
          name: dict.name
        }));

        assert.isTrue(stub.start.calledOnce, 'downloadable started.');
        assert.equal(listEl.appendChild.getCall(i).args[0], stub.element);
      }, this);

      assert.equal(window.Promise.all.getCall(0).returnValue, pAll);
      assert.isTrue(window.Promise.all.calledWith([
        ['es', 'el'], { getItems: '' }]));
    });

    test('not getting data', function() {
      var p1 = p.mGetNextPromise();
      p1.mRejectToError();

      // The behavior here is actually not defined,
      // but at least we should make sure setDownloaded is not called.
      fakeJSONData.forEach(function(downloaded, i) {
        var call = window.Downloadable.getCall(i);
        var stub = call.returnValue;

        assert.isFalse(stub.setDownloaded.called);
      });
    });

    suite('got downloaded dict', function() {
      var p1;
      setup(function() {
        p1 = p.mGetNextPromise();
        p1.mFulfillToValue([
          ['es', 'el'],
          [{}, undefined]
        ]);
      });

      test('downloadable updated', function() {
        [false, true, false].forEach(function(downloaded, i) {
          var call = window.Downloadable.getCall(i);
          var stub = call.returnValue;

          assert.isTrue(stub.setDownloaded.calledWith(downloaded));
        });
      });
    });
  });
});
