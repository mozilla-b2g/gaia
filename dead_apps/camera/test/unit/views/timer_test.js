suite('views/countdown', function() {
  'use strict';

  suiteSetup(function(done) {
    var self = this;
    requirejs(['views/countdown'], function(CountdownView) {
      self.CountdownView = CountdownView;
      done();
    });
  });

  setup(function() {
    this.countdown = new this.CountdownView();
    this.countdown.emit = sinon.spy();
  });

  suite('CountdownView#set()', function() {
    test('Should update the text content of the counter', function() {
      this.countdown.set(1000);
      assert.ok(this.countdown.el.innerHTML.indexOf(1000) > -1);
    });
  });

  suite('CountdownView#reset()', function() {
    test('Should clear the countdown text', function() {
      this.countdown.set(1000);
      assert.isTrue(this.countdown.el.innerHTML.indexOf('1000') > -1);
      this.countdown.reset();
      assert.isFalse(this.countdown.el.innerHTML.indexOf('1000') > -1);
    });

    test('Should remove `immanent` class', function() {
      this.countdown.setImmanent(true);
      assert.isTrue(this.countdown.el.classList.contains('immanent'));
      this.countdown.reset();
      assert.isFalse(this.countdown.el.classList.contains('immanent'));
    });
  });
});
