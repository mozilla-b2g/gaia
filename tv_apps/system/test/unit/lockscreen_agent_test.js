/* globals LockScreenAgent */
'use strict';

requireApp('system/js/lockscreen_agent.js');

suite('system/LockScreenAgent', function() {
  var lockScreenAgent;
  setup(function() {
    lockScreenAgent = new LockScreenAgent(document.createElement('div'));
  });

  test('It should register all events', function() {
    lockScreenAgent.start();
    var table = lockScreenAgent.configs.listens.reduce((current, ename) => {
      current[ename] = false;
      return current;
    }, {});
    this.sinon.stub(window, 'addEventListener',
      (ename) => {
        table[ename] = true;
      });
    // why we need start twice: since the table in the agent would only be
    // generated after we call the start, the start function would use
    // it to register all events at the same time.
    //
    // I don't want to pull the talbe out of the init function, because
    // we need to maintain the duplicated tables while the events change
    // in the future.
    lockScreenAgent.start();
    Object.keys(table).forEach((ename) => {
      assert.equal(table[ename], true,
        'the event "' + ename + '" is not registered');
    });
  });

  test('It would forward IAC message', function() {
    var stubPort = {
      postMessage: function() {}
    };
    window.IACHandler = {
      getPort: () => stubPort
    };
    var stubPostMessage = this.sinon.stub(stubPort, 'postMessage');
    lockScreenAgent.start();
    lockScreenAgent.handleEvent(
      new CustomEvent('lockscreen-request-mediacommand', {
        detail: 'fakecommand'
      })
    );
    assert.isTrue(stubPostMessage.calledWithMatch(
      sinon.match((message) => {
        return message.command === 'fakecommand';
      })
    ));
  });
});

