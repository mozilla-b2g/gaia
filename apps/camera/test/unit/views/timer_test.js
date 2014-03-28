suite('views/timer', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    req(['views/timer'], function(TimerView) {
      self.TimerView = TimerView;
      done();
    });
  });

  setup(function() {
    this.timer = new this.TimerView();
    this.timer.emit = sinon.spy();
  });

  suite('TimerView#set()', function() {
    test('Should update the text content of the counter', function() {
      this.timer.set(1000);
      assert.ok(this.timer.el.innerHTML.indexOf(1000) > -1);
    });

    test('Should add the \'immanent\' class if within the \'immanent\' threshold', function() {
      var classes = this.timer.el.classList;
      this.timer.set(5);
      assert.ok(!classes.contains('immanent'));
      this.timer.set(4);
      assert.ok(!classes.contains('immanent'));
      this.timer.set(3);
      assert.ok(classes.contains('immanent'));
      this.timer.set(2);
      assert.ok(classes.contains('immanent'));
      this.timer.set(1);
      assert.ok(classes.contains('immanent'));
    });
  });
});
