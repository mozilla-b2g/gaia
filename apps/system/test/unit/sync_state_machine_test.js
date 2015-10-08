/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* Any copyright is dedicated to the Public Domain.
 * http://creativecommons.org/publicdomain/zero/1.0/ */

/* global BaseModule */
/* global Deferred */
/* global Service */
/* global SyncStateMachineTransitions */

'use strict';

requireApp('system/test/unit/deferred.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/sync_state_machine.js');

suite('system/SyncStateMachine >', () => {

  var syncStateMachine;

  suiteSetup(function() {
    syncStateMachine = BaseModule.instantiate('SyncStateMachine');
    syncStateMachine.start();
  });

  suite('Initial state', () => {
    test('Integrity', () => {
      assert.ok(syncStateMachine !== undefined);

      // SyncStateMachine is supposed to expose a function per transition.
      for (var name in SyncStateMachineTransitions) {
        if (!SyncStateMachineTransitions.hasOwnProperty(name)) {
          continue;
        }
        assert.ok(syncStateMachine[name] !== undefined);
        assert.ok(syncStateMachine[name] instanceof Function);
      }
    });

    test('Initial state should be disabled', () => {
      assert.equal(Service.query('SyncStateMachine.state'), 'disabled');
    });
  });

  suite('Events invalid for state', () => {
    [{
      from: 'disabled',
      invalidEvents: [
        'disable',
        'sync',
        'error',
        'success'
      ],
      transition: 'enable'
    }, {
      from: 'enabling',
      invalidEvents: [
        'enable',
        'disable',
        'sync'
      ],
      transition: 'success'
    }, {
      from: 'enabled',
      invalidEvents: [
        'enable',
        'success'
      ],
      transition: 'sync'
    }, {
      from: 'syncing',
      invalidEvents: [
        'enable',
        'sync'
      ],
      transition: 'error'
    }, {
      from: 'errored',
      invalidEvents: [
        'sync',
        'success',
        'error'
      ],
      transition: 'disable'
    }].forEach(config => {
      test(config.from + ' - invalid events', (done) => {
        config.invalidEvents.forEach(event => {
          try {
            Service.request('SyncStateMachine:'+ event);
            assert.ok(false, 'Should have thrown exception');
          } catch(e) {
            assert.ok(true, 'Expected exception');
            assert.equal(e.message, 'Event ' + event +
                         ' invalid for the current state');
            assert.equal(Service.query('SyncStateMachine.state'),
                         config.from);
          }
        });
        Service.request('SyncStateMachine:' + config.transition).then(done);
      });
    });
  });

  suite('State transitions', () => {
    // Some of the events are repeated so we can test all the possible
    // transitions.
    [{
      from: 'disabled',
      to: 'enabling',
      transition: 'enable',
      expectedEvent: 'enabling',
      unexpectedEvents: [
        'enabled',
        'errored',
        'disabled',
        'syncing'
      ],
    }, {
      from: 'enabling',
      to: 'errored',
      transition: 'error',
      expectedEvent: 'errored',
      unexpectedEvents: [
        'enabled',
        'disabled',
        'enabling',
        'syncing'
      ]
    }, {
      from: 'errored',
      to: 'disabled',
      transition: 'disable',
      expectedEvent: 'disabled',
      unexpectedEvents: [
        'enabled',
        'enabling',
        'errored',
        'syncing'
      ]
    }, {
      from: 'disabled',
      to: 'enabling',
      transition: 'enable',
      expectedEvent: 'enabling',
      unexpectedEvents: [
        'enabled',
        'errored',
        'disabled',
        'syncing'
      ]
    }, {
      from: 'enabling',
      to: 'enabled',
      transition: 'success',
      expectedEvent: 'enabled',
      unexpectedEvents: [
        'enabling',
        'errored',
        'disabled',
        'syncing'
      ]
    }, {
      from: 'enabled',
      to: 'syncing',
      transition: 'sync',
      expectedEvent: 'syncing',
      unexpectedEvents: [
        'enabled',
        'enabling',
        'disabled',
        'errored'
      ]
    }, {
      from: 'syncing',
      to: 'enabled',
      transition: 'success',
      expectedEvent: 'enabled',
      unexpectedEvents: [
        'disabled',
        'enabling',
        'errored',
        'syncing'
      ]
    }, {
      from: 'enabled',
      to: 'syncing',
      transition: 'sync',
      expectedEvent: 'syncing',
      unexpectedEvents: [
        'enabled',
        'enabling',
        'disabled',
        'errored'
      ]
    }, {
      from: 'syncing',
      to: 'disabled',
      transition: 'disable',
      expectedEvent: 'disabled',
      unexpectedEvents: [
        'enabled',
        'errored',
        'enabling',
        'syncing'
      ]
    }, {
      from: 'disabled',
      to: 'enabling',
      transition: 'enable',
      expectedEvent: 'enabling',
      unexpectedEvents: [
        'disabled',
        'errored',
        'enabled',
        'syncing'
      ]
    }, {
      from: 'enabling',
      to: 'enabled',
      transition: 'success',
      expectedEvent: 'enabled',
      unexpectedEvents: [
        'enabling',
        'errored',
        'disabled',
        'syncing'
      ]
    }, {
      from: 'enabled',
      to: 'syncing',
      transition: 'sync',
      expectedEvent: 'syncing',
      unexpectedEvents: [
        'enabled',
        'enabling',
        'disabled',
        'errored'
      ]
    }, {
      from: 'syncing',
      to: 'errored',
      transition: 'error',
      expectedEvent: 'errored',
      unexpectedEvents: [
        'enabled',
        'disabled',
        'enabling',
        'syncing'
      ],
      arg: 'error'
    }, {
      from: 'errored',
      to: 'enabled',
      transition: 'enable',
      expectedEvent: 'enabled',
      unexpectedEvents: [
        'disabled',
        'enabling',
        'syncing',
        'errored'
      ]
    }, {
      from: 'enabled',
      to: 'disabled',
      transition: 'disable',
      expectedEvent: 'disabled',
      unexpectedEvents: [
        'enabled',
        'enabling',
        'errored',
        'syncing'
      ]
    }].forEach(config => {
      test('Transition ' + config.transition + ' while on ' +
           config.from + ' state', done => {
        var promises = [];

        var onexpectedDeferred = new Deferred();
        promises.push(onexpectedDeferred.promise);
        var onexpected = event => {
          assert.ok(true, 'Received expected SyncStateMachine' +
                    config.expectedEvent);
          assert.equal(event.detail.transition, config.transition);
          assert.equal(event.detail.from, config.from);
          if (config.arg) {
            assert.equal(event.detail.args[0], config.arg);
          }
          onexpectedDeferred.resolve();
        };

        var onunexpected = () => {
          assert.ok(false, 'Received unexpected event');
          cleanup();
        };

        function cleanup() {
          config.unexpectedEvents.forEach(unexpectedEvent => {
            window.removeEventListener('onsync' + unexpectedEvent,
                                       onunexpected);
          });
          window.removeEventListener('onsync' + config.expectedEvent,
                                     onexpected);
          done();
        }

        window.addEventListener('onsync' + config.expectedEvent,
                                onexpected);

        config.unexpectedEvents.forEach(unexpectedEvent => {
          window.addEventListener('onsync' + unexpectedEvent,
                                  onunexpected);
        });

        promises.push(new Promise(resolve => {
          Service.request('SyncStateMachine:' + config.transition, config.arg)
          .then(() => {
            assert.equal(Service.query('SyncStateMachine.state'), config.to);
            resolve();
          });
        }));

        Promise.all(promises).then(cleanup);
      });
    });
  });
});
