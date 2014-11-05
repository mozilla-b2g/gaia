/* globals LockScreenFrameAgent */
'use strict';

requireApp('system/lockscreen/js/lockscreen_frame_agent.js');

suite('system/LockScreenFrameAgent', function() {
  var lockScreenFrameAgent;
  setup(function() {
    lockScreenFrameAgent =
      new LockScreenFrameAgent(window);
  });

  test('It should register all events', function() {
    lockScreenFrameAgent.start();
    var table = lockScreenFrameAgent.configs
    .listens.reduce((current, ename) => {
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
    lockScreenFrameAgent.start();
    Object.keys(table).forEach((ename) => {
      assert.equal(table[ename], true,
        'the event "' + ename + '" is not registered');
    });
  });
});

