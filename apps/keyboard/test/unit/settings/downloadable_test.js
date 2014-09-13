'use strict';

/* global Downloadable, DatabasePromiseManager, MockPromise */

require('/js/settings/downloadable.js');
require('/js/settings/database_promise_manager.js');
require('/shared/test/unit/mocks/mock_promise.js');

suite('Downloadable', function() {
  var downloadable;
  var stubDatabasePromiseManager;

  var arraybuffer;

  var statusElement;
  var asideElement;

  suiteSetup(function() {
    var div = document.createElement('div');
    div.innerHTML =
      '<template id="dictionary-download-list-item">' +
        '<li>' +
          '<aside class="pack-end">' +
          '</aside>' +
          '<p class="label"></p>' +
          '<p><small class="status"></small></p>' +
        '</li>' +
      '</template>';

    document.body.appendChild(div);
  });

  setup(function() {
    this.sinon.stub(window, 'Promise', MockPromise);

    stubDatabasePromiseManager =
      this.sinon.stub(DatabasePromiseManager.prototype);

    arraybuffer = {};

    this.sinon.stub(window, 'confirm');

    navigator.mozL10n = {
      get: this.sinon.spy(function(id) {
        return id;
      })
    };
  });

  suite('preloaded', function() {
    setup(function() {
      downloadable = new Downloadable(stubDatabasePromiseManager, {
        label: 'foo Label',
        preloaded: true,
        name: 'foo'
      });
      downloadable.start();

      statusElement = downloadable.element.querySelector('.status');
      asideElement = downloadable.element.querySelector('aside');
    });

    test('preloaded', function() {
      assert.equal(statusElement.dataset.l10nId, 'preloaded');
      assert.equal(asideElement.firstElementChild, null);
    });

    test('click has no effect', function() {
      var evt = document.createEvent('UIEvent');
      evt.initUIEvent('click', false, false, null, null);
      downloadable.element.dispatchEvent(evt);

      assert.equal(statusElement.dataset.l10nId, 'preloaded');
      assert.equal(asideElement.firstElementChild, null);
    });
  });

  suite('pending', function() {
    setup(function() {
      downloadable = new Downloadable(stubDatabasePromiseManager, {
        label: 'foo Label',
        preloaded: false,
        name: 'foo'
      });
      downloadable.start();

      statusElement = downloadable.element.querySelector('.status');
      asideElement = downloadable.element.querySelector('aside');
    });

    test('pending', function() {
      assert.equal(statusElement.dataset.l10nId, '');
      assert.equal(asideElement.firstElementChild, null);
    });

    test('pending -> downloadable', function() {
      downloadable.setDownloaded(false);

      assert.equal(statusElement.dataset.l10nId, 'downloadable');
      var el = asideElement.firstElementChild;
      assert.equal(el.nodeName, 'BUTTON');
      assert.equal(el.dataset.l10nId, 'download');
    });

    test('pending -> loaded', function() {
      downloadable.setDownloaded(true);

      assert.equal(statusElement.dataset.l10nId, 'available');
      var el = asideElement.firstElementChild;
      assert.equal(el.nodeName, 'BUTTON');
      assert.equal(el.dataset.l10nId, 'delete');
    });
  });

  suite('downloadable', function() {
    setup(function() {
      downloadable = new Downloadable(stubDatabasePromiseManager, {
        label: 'foo Label',
        preloaded: false,
        name: 'foo'
      });
      downloadable.start();

      downloadable.setDownloaded(false);

      statusElement = downloadable.element.querySelector('.status');
      asideElement = downloadable.element.querySelector('aside');
    });

    test('downloadable', function() {
      assert.equal(statusElement.dataset.l10nId, 'downloadable');
      var el = asideElement.firstElementChild;
      assert.equal(el.nodeName, 'BUTTON');
      assert.equal(el.dataset.l10nId, 'download');
    });

    suite('click -> downloading', function() {
      var fakeXhrs;
      var p;

      setup(function() {
        fakeXhrs = this.sinon.useFakeXMLHttpRequest();

        var evt = document.createEvent('UIEvent');
        evt.initUIEvent('click', false, false, null, null);
        downloadable.element.dispatchEvent(evt);

        p = window.Promise.firstCall.returnValue;
      });

      test('downloading', function() {
        assert.equal( statusElement.dataset.l10nId, 'downloading');
        var el = asideElement.firstElementChild;
        assert.equal(el.nodeName, 'SPAN');
        assert.equal(el.className, 'loading');
      });

      test('downloading -> downloadable', function resolve() {
        p.mExecuteCallback(function resolve() {
          assert.isTrue(false, 'should not resolve');
        }, function reject() {
          p.mRejectToError();
        });

        var xhrRequest = fakeXhrs.requests[0];

        xhrRequest.response = arraybuffer;
        xhrRequest.respond(500, {}, '');

        assert.equal(statusElement.dataset.l10nId, 'downloadable');
        var el = asideElement.firstElementChild;
        assert.equal(el.nodeName, 'BUTTON');
        assert.equal(el.dataset.l10nId, 'download');
      });

      test('click -> confirm -> downloadable', function resolve() {
        p.mExecuteCallback(function resolve() {
          assert.isTrue(false, 'should not resolve');
        }, function reject() {
          p.mRejectToError();
        });

        window.confirm.returns(true);

        var evt = document.createEvent('UIEvent');
        evt.initUIEvent('click', false, false, null, null);
        downloadable.element.dispatchEvent(evt);

        assert.isTrue(navigator.mozL10n.get.calledWith('cancelPrompt'));

        assert.equal(statusElement.dataset.l10nId, 'downloadable');
        var el = asideElement.firstElementChild;
        assert.equal(el.nodeName, 'BUTTON');
        assert.equal(el.dataset.l10nId, 'download');
      });

      test('click -> not confirm -> downloading', function() {
        p.mExecuteCallback(function resolve() {
          assert.isTrue(false, 'should not resolve');
        }, function reject() {
          assert.isTrue(false, 'should not reject');
        });

        window.confirm.returns(false);

        var evt = document.createEvent('UIEvent');
        evt.initUIEvent('click', false, false, null, null);
        downloadable.element.dispatchEvent(evt);

        assert.isTrue(navigator.mozL10n.get.calledWith('cancelPrompt'));

        assert.equal( statusElement.dataset.l10nId, 'downloading');
        var el = asideElement.firstElementChild;
        assert.equal(el.nodeName, 'SPAN');
        assert.equal(el.className, 'loading');
      });

      suite('downloading -> loading', function() {
        setup(function(done) {
          p.mExecuteCallback(function resolve(d) {
            assert.equal(d, arraybuffer, 'should resolve with arraybuffer');

            var value = p.mFulfillToValue(arraybuffer);
            assert.equal(value, arraybuffer, 'data should be passed on.');

            done();
          }, function reject() {
            assert.isTrue(false, 'should not reject');
          });

          var xhrRequest = fakeXhrs.requests[0];

          assert.equal(xhrRequest.url,
            'https://fxos.cdn.mozilla.net/dictionaries/1/foo.dict');
          assert.equal(xhrRequest.method, 'GET');
          assert.equal(xhrRequest.async, true);
          assert.equal(xhrRequest.responseType, 'arraybuffer');

          xhrRequest.response = arraybuffer;
          xhrRequest.respond(200, {}, 'foo');
        });

        test('loading', function() {
          assert.equal(statusElement.dataset.l10nId, 'loading');
          var el = asideElement.firstElementChild;
          assert.equal(el.nodeName, 'SPAN');
          assert.equal(el.className, 'loading');
        });

        suite('loading -> loaded', function() {
          setup(function() {
            var obj = {};
            stubDatabasePromiseManager.setItem.returns(obj);

            var p1 = p.mGetNextPromise();
            var value = p1.mFulfillToValue(arraybuffer);

            assert.isTrue(stubDatabasePromiseManager.setItem
              .calledWith('foo', arraybuffer));
            assert.equal(value, obj,
              'onFulfill should return the object from database');

            var p2 = p1.mGetNextPromise();
            p2.mFulfillToValue();
          });

          test('loaded', function() {
            assert.equal(statusElement.dataset.l10nId, 'available');
            var el = asideElement.firstElementChild;
            assert.equal(el.nodeName, 'BUTTON');
            assert.equal(el.dataset.l10nId, 'delete');
          });
        });
      });
    });
  });

  suite('loaded', function() {
    setup(function() {
      downloadable = new Downloadable(stubDatabasePromiseManager, {
        label: 'foo Label',
        preloaded: false,
        name: 'foo'
      });
      downloadable.start();

      downloadable.setDownloaded(true);

      statusElement = downloadable.element.querySelector('.status');
      asideElement = downloadable.element.querySelector('aside');
    });

    test('loaded', function() {
      assert.equal(statusElement.dataset.l10nId, 'available');
      var el = asideElement.firstElementChild;
      assert.equal(el.nodeName, 'BUTTON');
      assert.equal(el.dataset.l10nId, 'delete');
    });

    test('click -> not conform -> available', function() {
      window.confirm.returns(false);

      var evt = document.createEvent('UIEvent');
      evt.initUIEvent('click', false, false, null, null);
      downloadable.element.dispatchEvent(evt);

      assert.equal(statusElement.dataset.l10nId, 'available');
      var el = asideElement.firstElementChild;
      assert.equal(el.nodeName, 'BUTTON');
      assert.equal(el.dataset.l10nId, 'delete');
    });

    suite('click -> confirm -> deleting', function() {
      var p;
      setup(function() {
        window.confirm.returns(true);

        p = new Promise(function() {});
        stubDatabasePromiseManager.deleteItem.returns(p);

        var evt = document.createEvent('UIEvent');
        evt.initUIEvent('click', false, false, null, null);
        downloadable.element.dispatchEvent(evt);

        assert.isTrue(navigator.mozL10n.get.calledWith('deletePrompt'));
      });

      test('deleting', function() {
        assert.equal(statusElement.dataset.l10nId, 'deleting');
        var el = asideElement.firstElementChild;
        assert.equal(el.nodeName, 'SPAN');
        assert.equal(el.className, 'loading');
      });

      test('deleting -> loaded', function() {
        p.mRejectToError();

        assert.equal(statusElement.dataset.l10nId, 'available');
        var el = asideElement.firstElementChild;
        assert.equal(el.nodeName, 'BUTTON');
        assert.equal(el.dataset.l10nId, 'delete');
      });

      suite('deleting -> downloadable', function() {
        setup(function() {
          p.mFulfillToValue(arraybuffer);
        });

        test('downloadable', function() {
          assert.equal(statusElement.dataset.l10nId, 'downloadable');
          var el = asideElement.firstElementChild;
          assert.equal(el.nodeName, 'BUTTON');
          assert.equal(el.dataset.l10nId, 'download');
        });
      });
    });
  });
});
