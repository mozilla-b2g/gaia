/* global LockScreenStateLogger */

'use strict';
requireApp('system/lockscreen/js/lockscreen_state_logger.js');
suite('system/LockScreenStateLogger', function() {
  var subject;
  setup(function() {
    subject = new LockScreenStateLogger();
  });

  test('it should log everything while the verbose flag is true',
  function() {
    var stubLog = this.sinon.stub(subject, 'log');
    subject.start({
      verbose: true
    });
    subject.error('foobar');
    assert.isTrue(stubLog.calledOnce,
      'when verbose is true the error function doesn\'t log things');
    subject.warning('foobar');
    assert.isTrue(stubLog.calledTwice,
      'when verbose is true the warning function doesn\'t log things');
    subject.verbose('foobar');
    assert.isTrue(stubLog.calledThrice,
      'when verbose is true the verbose function doesn\'t log things');
  });

  test('when it comes with the graph flag, it should log transferring',
  function() {
    this.sinon.stub(console, 'log');  // to prevent it really print the message
    subject.start({
      debug: true,
      graph: true
    });
    var stubPush = this.sinon.stub(subject.stateStack, 'push');
    subject.transfer('from', 'to', {});
    assert.isTrue(stubPush.called,
      'when the graph flag is true, it push no state into stack');
  });

  test('when it comes without the graph flag, it should not log transferring',
  function() {
    subject.start({
      graph: false
    });
    var stubPush = this.sinon.stub(subject.stateStack, 'push');
    subject.transfer('from', 'to', {});
    assert.isFalse(stubPush.called,
      'when the graph flag is false, it still push the state into stack');
  });
});
