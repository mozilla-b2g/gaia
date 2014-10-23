/* global LockScreenBaseState */

'use strict';
requireApp('system/lockscreen/js/lockscreen_base_state.js');
suite('sytem/LockScreenBaseState', function() {
  var subject;
  setup(function() {
    subject = (new LockScreenBaseState()).start();
  });
  test('it has the transferTo and transferOut method', function() {
    assert.isTrue('undefined' !== typeof subject.transferOut,
      'there is something wrong');
    assert.isTrue('undefined' !== typeof subject.transferTo,
      'there is something wrong');
  });
});
