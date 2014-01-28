'use strict';

mocha.globals(['LockScreenMediator', 'LockScreenWidgetFactory',
               'LockScreenRouter', 'LockScreenDummyWidget',
               'AppWindowManager']);

requireApp('system/js/lockscreen/mediator.js');
requireApp('system/js/lockscreen/widgets/basic.js');
requireApp('system/test/unit/lockscreen/mock_lockscreen_dummy_widget.js');

suite('system/LockScreenMediator >', function() {
  var stubById,
      mockRouter,
      mockFactory,
      mediator,
      originalRouter = window.LockScreenRouter,
      originalFactory = window.LockScreenWidgetFactory;

  setup(function() {
    mockRouter = function() {};
    mockFactory = function() {
      this.launch = function() {};
    };

    window.LockScreenRouter = mockRouter;
    window.LockScreenWidgetFactory = mockFactory;

    stubById = this.sinon.stub(document, 'getElementById', function() {
      return document.createElement('div');
    });
    mediator = new window.LockScreenMediator();
  });
  teardown(function() {
    window.LockScreenRouter = originalRouter;
    window.LockScreenWidgetFactory = originalFactory;
    stubById.restore();
  });
  suite('requests >', function() {
    test('to fire register request via instantiate the widget', function() {
      var stubRegister = this.sinon.stub(mediator, 'register'),
          widget = new window.LockScreenDummyWidget(mediator);
      assert.isTrue(stubRegister.calledWithMatch(sinon.match(
          function(name, widget, opts) {
            return 'Dummy' === name;
          })),
          'didn\'t call the register method after we create the widget');
      widget.deactivate();
    });
    test('unregister request should be handled and the widget should be ' +
         'undefined', function() {
      var stubUnregister = this.sinon.stub(mediator, 'unregister'),
          widget = new window.LockScreenDummyWidget(mediator),
          request = {
            'from': widget.configs.name,
            'type': 'unregister-widget'
          };
      mediator.request(request);
      assert.isTrue(stubUnregister.calledWithMatch(sinon.match(
          function(name) {
            return 'Dummy' === name;
          })),
          'didn\'t call the unregister method after we sent the request');
      stubUnregister.restore();
      mediator.unregister(widget.configs.name);
      assert.isUndefined(mediator.widgets[widget.configs.name],
        'the unregister method didn\'t unregister the widget');
    });
    test('to see if the mediator would handle the lock request', function() {
      var stubLock = this.sinon.stub(mediator, 'responseLock'),
          widget = new window.LockScreenDummyWidget(mediator),
          request = {
            'from': widget.configs.name,
            'type': 'lock'
          };
      mediator.request(request);
      assert.isTrue(stubLock.called,
        'the mediator called no response method after handling the request');
      widget.deactivate();
    });
    test('to see if the mediator would handle the unlock request', function() {
      var stubUnlock = this.sinon.stub(mediator, 'responseUnlock'),
          widget = new window.LockScreenDummyWidget(mediator),
          request = {
            'from': widget.configs.name,
            'type': 'unlock'
          };
      mediator.request(request);
      assert.isTrue(stubUnlock.called,
        'the mediator called no response method after handling the request');
      widget.deactivate();
    });
    test('to see if the invoking request (SecureApp) would be handled by the ' +
         'correct handler', function() {
      var stubInvokeMethod = this.sinon.stub(mediator, 'invokeSecureApp'),
          widget = new window.LockScreenDummyWidget(mediator),
          requestContent = {
            'method': 'secureapp',
            'detail': {
              'url': 'http://fake',
              'manifestUrl': 'http://fake/manifest.webapp'
            }
          },
          request = {
            'from': widget.configs.name,
            'type': 'invoke',
            'content': requestContent
          };
      mediator.request(request);
      assert.isTrue(stubInvokeMethod.called,
        'the mediator didn\'t invoke the secure app');
    });
    test('to see if the invoking request (Activity) would be handled by the ' +
         'correct handler', function() {
      var stubInvokeMethod = this.sinon.stub(mediator, 'invokeActivity'),
          stubUnlock = this.sinon.stub(mediator, 'unlock', function() {
            // To prevent mocking lots components needed while unlocking.
          }),
          widget = new window.LockScreenDummyWidget(mediator),
          activityContent = {
            'name': 'record',
            'data': {'type': 'photos'}
          },
          requestContent = {
            'method': 'activity',
            'detail': {
              'content': activityContent,
              'onerror': function() {},
              'onsuccess': function() {}
            }
          },
          request = {
            'from': widget.configs.name,
            'type': 'invoke',
            'content': requestContent
          };
      mediator.request(request);
      assert.isTrue(stubInvokeMethod.called,
        'the mediator didn\'t invoke the activity');
      stubUnlock.restore();
    });
    test('to see if the invoking request (Widget) would be handled by the ' +
         'correct handler', function() {
      var stubInvokeMethod = this.sinon.stub(mediator, 'invokeWidget'),
          widget = new window.LockScreenDummyWidget(mediator),
          request = {
            'from': widget.configs.name,
            'type': 'invoke',
            'content': {
              'name': 'Foo'
            }
          };
      mediator.request(request);
      assert.isTrue(stubInvokeMethod.called,
        'the mediator didn\'t invoke the widget');
    });
    test('to see if the request of canvas would be handled', function(done) {
      stubById.restore(); // To stub it again.
      var stubByDummyId = this.sinon.stub(document, 'getElementById',
          function () {
            var dom = document.createElement('div');
            dom.id = 'dummy';
            return dom;
          }),
          widget = new window.LockScreenDummyWidget(mediator),
          request = {
            'from': widget.configs.name,
            'type': 'canvas',
            'content': {
              'method': 'id',
              'selector': 'dummy',
              'response': (function(canvas) {
                assert.isTrue('dummy' === canvas.id);
                stubByDummyId.restore();
                stubById = this.sinon.stub(document, 'getElementById',
                  function() {
                    return document.createElement('div');
                  });
                done();
              }).bind(this)
            }
          };
      mediator.request(request);
    });
  });

  suite('methods >', function() {
    test('askToUnlock would ask every auditors and return the result',
      function() {
        var setup = window.LockScreenDummyWidget.prototype.setup,
            mockSetupForTrue = function() {
              this.configs.name = 'AuditorTrue';
              this.configs.options = {
                'unlockAuditor': true
              };
            },
            mockSetupForFalse = function() {
              this.configs.name = 'AuditorFalse';
              this.configs.options = {
                'unlockAuditor': true
              };
            };
        window.LockScreenDummyWidget.prototype.setup = mockSetupForTrue;
        var mockAuditorTrue = new window.LockScreenDummyWidget(mediator);
        mockAuditorTrue.permitUnlock = function() { return true; };

        window.LockScreenDummyWidget.prototype.setup = mockSetupForFalse;
        var mockAuditorFalse = new window.LockScreenDummyWidget(mediator);
        mockAuditorFalse.permitUnlock = function() { return false; };

        assert.isFalse(mediator.askToUnlock(),
            'ask auditors contain false opinion but still passed');

        window.LockScreenDummyWidget.prototype.setup = setup;
        mockAuditorTrue.deactivate();
        mockAuditorFalse.deactivate();
      });

    test('unlock would do all unlocking things', function(done) {
      var originalManager = window.AppWindowManager,
          messages = [],
          stubPost = this.sinon.stub(mediator, 'post', function(message) {
            messages.push(message);
          }),
          stubBroadcastStateChanged = this.sinon.stub(mediator,
            'broadcastStateChanged'),
          stubPlayUnlockedStyle = this.sinon.stub(mediator, 'playUnlockedStyle',
            function() {
              return {
                then: function(cb) {
                  cb();
                  assert.isTrue(-1 !== messages.indexOf('will-unlock'),
                    'it didn\'t broadcast the "will-unlock" message');
                  assert.isTrue(-1 !== messages.indexOf('secure-modeoff'),
                    'it didn\'t broadcast the "secure-modeoff" message');
                  assert.isTrue(-1 !== messages.indexOf('unlock'),
                    'it didn\'t broadcast the "unlock" message');
                  assert.isTrue(stubBroadcastStateChanged.calledWithMatch(
                      'locked',
                      'locked',
                      'will-unlock'
                      ),
                    'it didn\'t broadcast the state changed message');
                  window.AppWindowManager = originalManager;
                  stubPlayUnlockedStyle.restore();
                  stubPost.restore();
                  done();
                }
              };
            });
      window.AppWindowManager = {
        getActiveApp: function() {
          return {
            tryWaitForFullRepaint: function(nextPaint) {
              nextPaint();
            }
          };
        }
      };
      mediator.unlock();
    });
    test('broadcast would notify widgets', function(done) {
      var widget = new window.LockScreenDummyWidget(mediator),
          stubNotify = this.sinon.stub(widget, 'notify',
            function(message, channel) {
              assert.equal(message, 'message',
                'expect broadcast would notify all widgets');
              assert.equal(channel, 'channel',
                'expect broadcast would notify all widgets');
              stubNotify.restore();
              done();
            });
      mediator.broadcast('message', 'channel');
    });
  });
});
