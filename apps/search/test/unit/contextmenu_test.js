'use strict';

require('/js/contextmenu.js');

suite('search/contextmenu', function() {

  var subject = null,
      realBookmarks = null,
      isBookmarked = false;

  suiteSetup(function() {
    realBookmarks = window.Bookmarks;
    window.Bookmarks = {
      get: function() {
        return isBookmarked;
      }
    };
    loadBodyHTML('/index.html');
  });

  suiteTeardown(function() {
    window.Bookmarks = realBookmarks;
  });

  setup(function() {
    this.sinon.useFakeTimers();
    subject = new window.Contextmenu();
  });

  suite('handleEvent', function() {
    function createIcon() {
      var target = document.createElement('div');
      var link = document.createElement('a');
      link.href = '#';
      link.classList.add('tap');
      target.appendChild(link);
      return target;
    }

    test('contextmenu icon not bookmarked', function() {
      var target = createIcon();
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
        target: target.querySelector('.tap')
      };

      var startStub = this.sinon.stub(subject.grid, 'start');
      var stopStub = this.sinon.stub(subject.grid, 'stop');
      subject.handleEvent(fakeContextMenuEvent);
      assert.ok(stopStub.calledOnce);
      this.sinon.clock.tick();
      assert.ok(startStub.calledOnce);
    });

    test('contextmenu icon already bookmarked', function() {
      var target = createIcon();
      target.getIcon = function() {
        return {
          detail: {
            type: 'bookmark'
          }
        };
      };
      target.stop = function() {};
      subject.grid = target;

      var fakeContextMenuEvent = {
        type: 'contextmenu',
        target: target.querySelector('.tap')
      };

      isBookmarked = true;
      var stopStub = this.sinon.stub(subject.grid, 'stop');
      subject.handleEvent(fakeContextMenuEvent);
      assert.isFalse(stopStub.called);
    });
  });
});
