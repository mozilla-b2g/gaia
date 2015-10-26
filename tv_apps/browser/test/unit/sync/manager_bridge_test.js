/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* global SyncManagerBridge */

'use strict';

requireApp('browser/js/sync/manager_bridge.js');

suite('SyncManagerBridge >', () => {
  var subject;
  var realMozApps;
  var port;
  var app;
  var onmessageData;

  suiteSetup(() => {
    subject = SyncManagerBridge;

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
  });

  suiteTeardown(() => {
    subject = null;
    navigator.mozApps = realMozApps;
  });

  suite('Initial state', () => {
    test('Integrity', () => {
      assert.ok(subject != null);
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

  suite('listeners', () => {
    suiteTeardown(() => {
      subject._listeners.clear();
    });

    test('addListener', () => {
      assert.equal(subject._listeners.size, 0);
      this.listener = () => {};
      subject.addListener(this.listener);
      assert.equal(subject._listeners.size, 1);
      assert.ok(subject._listeners.has(this.listener));
    });

    test('removeListener', () => {
      assert.equal(subject._listeners.size, 1);
      assert.ok(subject._listeners.has(this.listener));
      subject.removeListener(this.listener);
      assert.equal(subject._listeners.size, 0);
    });
  });

  suite('getInfo', () => {
    var postMessageSpy;
    var dateNowStub;
    var now;
    var listenerCalled;

    setup(() => {
      postMessageSpy = this.sinon.spy(port, 'postMessage');
      dateNowStub = this.sinon.stub(Date, 'now', () => {
        return now;
      });
      subject.addListener(() => {
        listenerCalled = true;
      });
    });

    teardown(() => {
      postMessageSpy.restore();
      dateNowStub.restore();
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
        assert.ok(!listenerCalled);
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
    var observedMessage;
    var now;

    setup(() => {
      postMessageSpy = this.sinon.spy(port, 'postMessage');
      var listener = (message) => {
        console.log('mes', JSON.stringify(message));
        observedMessage = message;
      };
      subject.addListener(listener);
    });

    teardown(() => {
      postMessageSpy.restore();
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
        assert.deepEqual(observedMessage, expectedMessage.data);
        done();
      });
    });
  });

});
