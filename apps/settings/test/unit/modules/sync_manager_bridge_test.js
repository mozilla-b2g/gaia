/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

'use strict';

suite('settings/SyncManagerBridge >', () => {
  var subject;
  var realMozApps;
  var port;
  var app;
  var onmessageData;

  suiteSetup(done => {
    navigator.addIdleObserver = sinon.spy();

    realMozApps = navigator.mozApps;
    port = {
      postMessage: function() {},
      set onmessage(callback) {
        setTimeout(() => {
          callback({ data: onmessageData });
        });
      }
    };

    app = {
      connect: function() {
        return Promise.resolve([port]);
      }
    };

    var onsuccess = {
      set onsuccess(callback) {
        setTimeout(() => {
          callback({ target: { result: app } });
        });
      }
    };

    navigator.mozApps = {
      getSelf: function() {
        return onsuccess;
      }
    };

    testRequire(['modules/sync_manager_bridge'], SyncManagerBridge => {
      subject = SyncManagerBridge;
      done();
    });
  });

  suiteTeardown(() => {
    navigator.mozApps = realMozApps;
  });

  suite('Initial state', () => {
    test('Integrity', () => {
      assert.ok(subject !== null);
      assert.isNull(subject._port);
      assert.equal(subject._requests.size, 0);
    });
  });

  ['enable',
   'disable',
   'sync'].forEach(method => {
    suite(method, () => {
      var getSelfSpy;
      var connectSpy;
      var postMessageSpy;

      setup(() => {
        getSelfSpy = this.sinon.spy(navigator.mozApps, 'getSelf');
        connectSpy = this.sinon.spy(app, 'connect');
        postMessageSpy = this.sinon.spy(port, 'postMessage');
      });

      teardown(() => {
        getSelfSpy.restore();
        connectSpy.restore();
        postMessageSpy.restore();
      });

      suiteTeardown(() => {
        subject._port = null;
      });

      test(method + ' - no previous connection', done => {
        subject[method]();
        setTimeout(() => {
          this.sinon.assert.calledOnce(getSelfSpy);
          this.sinon.assert.calledOnce(connectSpy);
          this.sinon.assert.calledOnce(postMessageSpy);
          assert.equal(postMessageSpy.getCall(0).args[0].name, method);
          done();
        });
      });

      test(method + ' - previous connection', done => {
        subject[method]();
        setTimeout(() => {
          this.sinon.assert.notCalled(getSelfSpy);
          this.sinon.assert.notCalled(connectSpy);
          this.sinon.assert.calledOnce(postMessageSpy);
          assert.equal(postMessageSpy.getCall(0).args[0].name, method);
          done();
        });
      });
    });
  });

  suite('getInfo', () => {
    var postMessageSpy;
    var dateNowStub;
    var onsyncchangeSpy;
    var now;

    setup(() => {
      postMessageSpy = this.sinon.spy(port, 'postMessage');
      dateNowStub = this.sinon.stub(Date, 'now', () => {
        return now;
      });
      subject.onsyncchange = () => {};
      onsyncchangeSpy = this.sinon.spy(subject, '_onsyncchange');
    });

    teardown(() => {
      postMessageSpy.restore();
      dateNowStub.restore();
      onsyncchangeSpy.restore();
    });

    test('getInfo', done => {
      now = 'now';
      var expectedMessage = {
        data: {
          id: now,
          result: 'whatever'
        }
      };
      subject.getInfo().then(message => {
        assert.equal(message.id, expectedMessage.data.id);
        assert.equal(message.result, expectedMessage.data.result);
        this.sinon.assert.notCalled(onsyncchangeSpy);
        done();
      });
      setTimeout(() => {
        this.sinon.assert.calledOnce(postMessageSpy);
        assert.equal(postMessageSpy.getCall(0).args[0].name, 'getInfo');
        assert.equal(postMessageSpy.getCall(0).args[0].id, now);
        assert.ok(subject._requests.has(now));
        subject.onmessage(expectedMessage);
      });
    });
  });

  suite('onsyncchange', () => {
    var postMessageSpy;
    var onsyncchangeSpy;
    var now;

    setup(() => {
      postMessageSpy = this.sinon.spy(port, 'postMessage');
      subject.onsyncchange = () => {};
      onsyncchangeSpy = this.sinon.spy(subject, '_onsyncchange');
    });

    teardown(() => {
      postMessageSpy.restore();
      onsyncchangeSpy.restore();
    });

    test('getInfo', done => {
      var expectedMessage = {
        data: {
          name: 'onsyncchange',
          result: 'whatever'
        }
      };

      subject.onmessage(expectedMessage);
      setTimeout(() => {
        this.sinon.assert.notCalled(postMessageSpy);
        assert.ok(!(subject._requests.has(now)));
        this.sinon.assert.calledOnce(onsyncchangeSpy);
        assert.equal(onsyncchangeSpy.getCall(0).args[0].result,
                     expectedMessage.data.result);
        done();
      });
    });

  });
});
