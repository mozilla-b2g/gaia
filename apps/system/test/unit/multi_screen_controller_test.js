/* global MocksHelper, ActionMenu, BaseModule, BroadcastChannel */
'use strict';

require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/test/unit/mock_action_menu.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/multi_screen_controller.js');

var mocksForMultiScreenController = new MocksHelper([
  'ActionMenu',
  'LazyLoader'
]).init();

suite('system/MultiScreenController', function() {
  mocksForMultiScreenController.attachTestHelpers();

  var subject;
  var settingsKey = 'multiscreen.enabled';

  var mockConfig = {
    url: 'test'
  };
  var mockExternalDisplays = [
    {
      id: 1,
      name: 'External Display 1'
    },
    {
      id: 2,
      name: 'External Display 2'
    }
  ];

  function triggerMozChromeEvent(detail) {
    window.dispatchEvent(new CustomEvent('mozChromeEvent', {
      detail: detail
    }));
  }

  setup(function() {
    subject = BaseModule.instantiate('MultiScreenController');
    subject.start();
    subject['_observe_' + settingsKey](true);
  });

  teardown(function() {
    subject.stop();
  });

  suite('start', function() {
    test('should establish a broadcast channel', function() {
      assert.isNotNull(subject.broadcastChannel);
      assert.equal(subject.broadcastChannel.name, 'multiscreen');
    });
  });

  suite('settings', function() {
    test('toggle "' + settingsKey + '"', function() {
      subject.stop();
      subject.start();

      var stubAddEventListener =
        this.sinon.stub(window, 'addEventListener');
      var stubRemoveEventListener =
        this.sinon.stub(window, 'removeEventListener');

      subject['_observe_' + settingsKey](true);
      assert.isTrue(subject.enabled());

      subject['_observe_' + settingsKey](false);
      assert.isFalse(subject.enabled());

      stubAddEventListener.restore();
      stubRemoveEventListener.restore();
    });
  });

  suite('queryExternalDisplays', function() {
    var promise;

    setup(function() {
      promise = subject.queryExternalDisplays();
    });

    test('should resolve with external displays', function(done) {
      promise.then(function(displays) {
        done(function() {
          assert.equal(displays, mockExternalDisplays);
        });
      });
      triggerMozChromeEvent({
        type: 'get-display-list-success',
        display: mockExternalDisplays
      });
    });

    test('should reject if get-display-list is failed', function(done) {
      promise.catch(function() {
        done();
      });
      triggerMozChromeEvent({
        type: 'get-display-list-error',
        reason: ''
      });
    });

    test('should reject if there\'s a pending query', function(done) {
      subject.queryExternalDisplays().catch(function() {
        done();
      });
    });
  });

  suite('showMenu', function() {
    test('should show the action menu', function(done) {
      this.sinon.stub(ActionMenu.prototype, 'show', function(items, titleId) {
        done(function() {
          assert.equal(titleId, 'multiscreen-pick');
          for(var i in items) {
            assert.equal(items[i].label, mockExternalDisplays[i].name);
            assert.equal(items[i].value, mockExternalDisplays[i].id);
          }
        });
      });
      subject.showMenu(mockExternalDisplays);
    });

    test('should resolve with displayId if user choose a external display',
                                                                function(done) {
      subject.showMenu(mockExternalDisplays).then(function(choice) {
        done(function() {
          assert.equal(choice, 1);
        });
      });
      subject.actionMenu.onselected(1);
    });

    test('should resolve without displayId if user cancels', function(done) {
      subject.showMenu(mockExternalDisplays).then(function(choice) {
        done(function() {
          assert.isUndefined(choice);
        });
      });
      subject.actionMenu.oncancel();
    });

    test('should resolve immediately if no external display connected',
                                                                function(done) {
      this.sinon.stub(ActionMenu.prototype, 'show');
      subject.showMenu([]).then(function(choice) {
        done(function() {
          assert.isUndefined(choice);
          assert.isTrue(ActionMenu.prototype.show.notCalled);
        });
      });
    });

    test('should reject if there\'s already an action menu', function(done) {
      subject.showMenu(mockExternalDisplays);
      subject.showMenu(mockExternalDisplays).catch(function() {
        done();
      });
    });
  });

  suite('chooseDisplay', function() {
    var broadcastChannel;

    setup(function() {
      broadcastChannel = new BroadcastChannel('multiscreen');

      this.sinon.stub(subject, 'queryExternalDisplays', function() {
        return Promise.resolve();
      });
    });

    teardown(function() {
      broadcastChannel.close();
    });

    test('should post "launch-app" message and resolve if user chooses an ' +
                                            'external display', function(done) {
      var chosenDisplayId = 123;
      this.sinon.stub(subject, 'showMenu', function() {
        return Promise.resolve(chosenDisplayId);
      });
      this.sinon.stub(subject, 'postMessage');
      subject.chooseDisplay(mockConfig).then(function(displayId) {
        done(function() {
          assert.isTrue(subject.postMessage.calledWith(
            chosenDisplayId,
            'launch-app',
            mockConfig
          ));
          assert.equal(displayId, chosenDisplayId);
        });
      });
    });

    test('should reject if user cancels the action menu', function(done) {
      this.sinon.stub(subject, 'showMenu', function() {
        return Promise.resolve();
      });
      subject.chooseDisplay(mockConfig).catch(function() {
        done();
      });
    });

    test('should reject if "isSystemMessage" is set', function(done) {
      this.sinon.stub(subject, 'showMenu', function() {
        return Promise.resolve(1);
      });
      subject.chooseDisplay({
        isSystemMessage: true
      }).catch(function() {
        done();
      });
    });

    test('should reject if "stayBackground" is set', function(done) {
      this.sinon.stub(subject, 'showMenu', function() {
        return Promise.resolve(1);
      });
      subject.chooseDisplay({
        stayBackground: true
      }).catch(function() {
        done();
      });
    });
  });

  suite('postMessage', function() {
    test('should post the message well-formedly', function(done) {
      var fakeDisplayId = 123;
      var fakeType = 'type';
      var fakeDetail = {
        data1: '1',
        data2: 2
      };
      this.sinon.stub(subject.broadcastChannel, 'postMessage', function(data) {
        done(function() {
          assert.equal(data.target, fakeDisplayId);
          assert.equal(data.type, fakeType);
          assert.equal(data.detail, fakeDetail);
          assert.isUndefined(data.source);
        });
      });
      subject.postMessage(fakeDisplayId, fakeType, fakeDetail);
    });
  });

  suite('receive messages', function() {
    var broadcastChannel;
    var fakeDisplayId = 123;

    setup(function() {
      broadcastChannel = new BroadcastChannel('multiscreen');
    });

    teardown(function() {
      broadcastChannel.close();
    });

    test('should invoke "_handle_message" when receiving broadcast messages',
                                                                function(done) {
      this.sinon.stub(subject, '_handle_message', function() {
        done();
      });
      broadcastChannel.postMessage({});
    });

    test('should publish event when receiving "launch-app-success"',
                                                                function(done) {
      this.sinon.stub(subject, 'publish', function(event, detail) {
        console.log(event);
        if (event == 'launch-app-success') {
          done(function() {
            assert.equal(detail.displayId, fakeDisplayId);
            assert.equal(detail.config.url, mockConfig.url);
          });
        }
      });
      broadcastChannel.postMessage({
        source: fakeDisplayId,
        type: 'launch-app-success',
        detail: {
          config: mockConfig
        }
      });
    });

    test('should publish event when receiving "launch-app-error"',
                                                                function(done) {
      this.sinon.stub(subject, 'publish', function(event, detail) {
        console.log(event);
        if (event == 'launch-app-error') {
          done(function() {
            assert.equal(detail.displayId, fakeDisplayId);
            assert.equal(detail.reason, 'reason');
          });
        }
      });
      broadcastChannel.postMessage({
        source: fakeDisplayId,
        type: 'launch-app-error',
        detail: {
          reason: 'reason'
        }
      });
    });
  });

  suite('presentation device selection', function() {
    var eventValidator;

    function _content_event_handler(evt) {
      if (eventValidator) {
        eventValidator(evt);
      }
    }

    setup(function() {
      window.navigator.mozPresentationDeviceInfo = {
        getAll: function() {
          return Promise.resolve([
              { name: 'test-name',
                id: 'test-id',
                type: 'test-type' }
          ]);
        }
      };
      window.addEventListener('mozContentEvent', _content_event_handler);
    });

    teardown(function() {
      delete window.navigator.mozPresentationDeviceInfo;
      window.removeEventListener('mozContentEvent', _content_event_handler);
    });

    test('device selected', function(done) {
      eventValidator = function(evt) {
        if (evt.detail.type !== 'presentation-select-result') {
          return;
        }

        done(function() {
          assert.equal(evt.detail.type, 'presentation-select-result');
          assert.equal(evt.detail.deviceId, 'test-id');
          assert.equal(evt.detail.id, 'test-selection-id');
        });
      };

      this.sinon.stub(subject, 'showMenu', function(displays) {
        assert.equal(displays.length, 1);
        assert.equal(displays[0].name, 'test-name');
        assert.equal(displays[0].deviceId, 'test-id');
        assert.equal(displays[0].id, 0);
        return Promise.resolve(0);
      });

      triggerMozChromeEvent({
        type: 'presentation-select-device',
        id: 'test-selection-id',
      });
    });

    test('selection canceled', function(done) {
      eventValidator = function(evt) {
        if (evt.detail.type !== 'presentation-select-deny') {
          return;
        }

        done(function() {
          assert.equal(evt.detail.type, 'presentation-select-deny');
          assert.equal(evt.detail.id, 'test-selection-id');
        });
      };

      this.sinon.stub(subject, 'showMenu', function() {
        return Promise.resolve(undefined);
      });

      triggerMozChromeEvent({
        type: 'presentation-select-device',
        id: 'test-selection-id',
      });
    });

    test('canceled while no available device', function(done) {
      window.navigator.mozPresentationDeviceInfo = {
        getAll: function() {
          return Promise.resolve([]);
        }
      };

      eventValidator = function(evt) {
        if (evt.detail.type !== 'presentation-select-deny') {
          return;
        }

        done(function() {
          assert.equal(evt.detail.type, 'presentation-select-deny');
          assert.equal(evt.detail.id, 'test-selection-id');
        });
      };

      triggerMozChromeEvent({
        type: 'presentation-select-device',
        id: 'test-selection-id',
      });
    });
  });
});
