'use strict';

require('/js/contextmenu.js');

suite('search/contextmenu', function() {

  var subject;

  suiteSetup(function() {
    loadBodyHTML('/index.html');
  });

  setup(function() {
    this.sinon.useFakeTimers();
    subject = new window.Contextmenu();
  });

  suite('handleEvent', function() {
    test('contextmenu', function() {
      var target = document.createElement('div');
      target.getIcon = function() {
        return {
          detail: {
            type: 'bookmark'
          }
        };
      };
      target.start = function() {};
      target.stop = function() {};
      subject.grid = target;

      var fakeContextMenuEvent = {
        type: 'contextmenu',
        target: target
      };

      var startStub = this.sinon.stub(subject.grid, 'start');
      var stopStub = this.sinon.stub(subject.grid, 'stop');
      subject.handleEvent(fakeContextMenuEvent);
      assert.ok(stopStub.calledOnce);
      this.sinon.clock.tick();
      assert.ok(startStub.calledOnce);
    });
  });
});
