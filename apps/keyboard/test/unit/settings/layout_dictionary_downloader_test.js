'use strict';

/* global LayoutDictionaryDownloader */

require('/js/settings/layout_dictionary_downloader.js');

suite('LayoutDictionaryDownloader', function() {
  var fakeXhr;
  var requests;

  var downloader;
  var p;

  var fakeLatinData = (function() {
    var view = new Uint8Array(42);
    var str = 'FxOSDICT';
    var i = str.length;

    while (i--) {
      view[i] = str.charCodeAt(i);
    }

    return view.buffer;
  })();

  setup(function() {
    requests = [];

    fakeXhr = sinon.useFakeXMLHttpRequest();
    fakeXhr.onCreate = function(request) {
      requests.push(request);
    };
  });

  teardown(function() {
    fakeXhr.restore();
  });

  test('onprogress', function() {
    downloader = new LayoutDictionaryDownloader('latin', 'ab_cd.dict');
    downloader.onprogress = this.sinon.stub();

    p = downloader.load();

    assert.equal(requests.length, 1);

    var request = requests[0];
    request.onprogress({
      type: 'progress',
      loaded: 10,
      total: 100
    });

    assert.isTrue(downloader.onprogress.calledWith(10, 100));
  });

  test('abort()', function(done) {
    downloader = new LayoutDictionaryDownloader('latin', 'ab_cd.dict');
    downloader.onprogress = this.sinon.stub();

    p = downloader.load();

    downloader.abort();

    var request = requests[0];
    assert.isTrue(request.aborted);

    p.then(function(data) {
      assert.isTrue(false, 'Should not resolve.');
    }, function() {
      assert.isFalse(downloader.onprogress.calledOnce);
    }).then(done, done);
  });

  suite('latin imEngine data', function() {
    setup(function() {
      downloader = new LayoutDictionaryDownloader('latin', 'ab_cd.dict');
      downloader.onprogress = this.sinon.stub();

      p = downloader.load();

      assert.equal(requests.length, 1);

      var request = requests[0];
      assert.equal(request.url,
        'https://fxos.cdn.mozilla.net/dictionaries/latin/1/ab_cd.dict');
      assert.equal(request.responseType, 'arraybuffer');
    });

    test('load() with valid data.', function(done) {
      var request = requests[0];
      request.response = fakeLatinData;

      request.respond(200, {}, '');

      p.then(function(data) {
        assert.isTrue(downloader.onprogress.calledWith(42, 42));
        assert.equal(data, fakeLatinData);
      }).then(done, done);
    });

    test('load() with invalid data.', function(done) {
      var request = requests[0];
      request.response = new ArrayBuffer(42);

      request.respond(200, {}, '');

      p.then(function(data) {
        assert.isTrue(false, 'Should not resolve.');
      }, function() {
        assert.isFalse(downloader.onprogress.calledOnce);
      }).then(done, done);
    });

    test('load() with xhr failure.', function(done) {
      var request = requests[0];
      request.response = null;

      request.respond(0, {}, '');

      p.then(function(data) {
        assert.isTrue(false, 'Should not resolve.');
      }, function() {
        assert.isFalse(downloader.onprogress.calledOnce);
      }).then(done, done);
    });
  });
});
