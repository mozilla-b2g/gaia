'use strict';

var Tests = function() {
  this.loaded = false;
};

Tests.prototype = {
  name: 'Tests',
  testMainNavigation: function(done) {
    this.doAfterLoaded(function() {
      function getFirstPanel() {
        return window.ui.mediaLibraryPage.panelManager.panels[0];
      }

      getFirstPanel().router.route('pop')();

      var panelButtons =
        getFirstPanel().dom.items.querySelectorAll('.gotoPanelButton');
      var i = 0;

      function next() {
        panelButtons[i].tapManager.router.route('tap')();
        setTimeout(function() {
          getFirstPanel().router.route('pop')();
          i++;
          var all_songs_index = 5;
          if (i === all_songs_index)
            i = 6;
          if (i < panelButtons.length)
            setTimeout(next, 500);
          else if (done)
            done();
        }, 500);
      }

      next();
    });
  },
  doAfterLoaded: function(fn) {
    if (this.loaded) {
      fn();
    }
    else {
      window.musicLibrary.router.when('doneLoading', function() {
        setTimeout(function() {
          this.loaded = true;
          fn();
        }.bind(this), 1000);
      }.bind(this), { 'module': this, 'name': 'doneLoading' });
    }

  }
};
