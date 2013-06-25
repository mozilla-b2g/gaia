function ViewVisibility() {
  this.init();
}

ViewVisibility.prototype = {
  init: function(){
    this.dom = {};
    var ids = [
      'content',
      'contentOverlay',
      'metaDrawer',
      'sourcesMetaDrawer',
      'settingsMetaDrawer',
      'playlistDrawer',
      'currentMusicPage',
      'currentMusicPageHeaderTitle',
      'selectMusicPage',

      'gotoCurrentMusicPage',
      'gotoSelectMusicPage',
      'toggleMetaDrawer',
      'togglePlaylistDrawer',
      'gotoSettings',
      'gotoSources',

      'toggleCurrentMusicPageView',
      'currentSourceView',
      'currentPlaylistView'
    ];
    for (var i = 0; i < ids.length; i++){
      var id = ids[i];
      this.dom[id] = document.getElementById(id);
    }
    this.locked = false;
  },
  showCurrentMusicPage: function(){
    if (this.locked)
      return;
    this.locked = true;

    var slide = function(){
      this.dom.selectMusicPage.classList.add('hidden');
      this.dom.contentOverlay.classList.add('hidden');

      this.dom.selectMusicPage.classList.remove('center');
      this.dom.selectMusicPage.classList.add('left');

      this.dom.currentMusicPage.classList.remove('right');
      this.dom.currentMusicPage.classList.add('center');

      TransitionUtils.fadeIn(this.dom.gotoSelectMusicPage);
      TransitionUtils.fadeIn(this.dom.currentMusicPageHeaderTitle);
      TransitionUtils.fadeIn(this.dom.togglePlaylistDrawer, function(){
        this.locked = false;
      }.bind(this));
    }.bind(this);

    var numTodo = 3;
    var next = function(){
      numTodo -= 1
      if (numTodo === 0)
        slide();
    }.bind(this);

    this.dom.currentMusicPage.classList.remove('hidden');
    TransitionUtils.fadeIn(this.dom.contentOverlay, next);
    TransitionUtils.fadeOut(this.dom.toggleMetaDrawer, next);
    TransitionUtils.fadeOut(this.dom.gotoCurrentMusicPage, next);

  },
  showSelectMusicPage: function(){
    if (this.locked)
      return;
    this.locked = true;

    var slide = function(){
      this.dom.currentMusicPage.classList.add('hidden');
      this.dom.contentOverlay.classList.add('hidden');

      this.dom.selectMusicPage.classList.remove('left');
      this.dom.selectMusicPage.classList.add('center');

      this.dom.currentMusicPage.classList.remove('center');
      this.dom.currentMusicPage.classList.add('right');

      TransitionUtils.fadeIn(this.dom.gotoCurrentMusicPage);
      TransitionUtils.fadeIn(this.dom.toggleMetaDrawer);
      Utils.runEventOnce(this.dom.toggleMetaDrawer, 'transitionend', function(){
        this.locked = false;
      }.bind(this));
    }.bind(this);

    this.dom.selectMusicPage.classList.remove('hidden');

    var numTodo = 4;
    var next = function(){
      numTodo -= 1
      if (numTodo === 0)
        slide();
    }.bind(this);

    TransitionUtils.fadeIn(this.dom.contentOverlay, next);
    TransitionUtils.fadeOut(this.dom.togglePlaylistDrawer, next);
    TransitionUtils.fadeOut(this.dom.gotoSelectMusicPage, next);
    TransitionUtils.fadeOut(this.dom.currentMusicPageHeaderTitle, next);
  },
  toggleMetaDrawer: function(){
    if (this.locked)
      return;
    this.locked = true;

    var wasVisible = this.dom.content.classList.contains('partialRight');

    var slide = function(){
      this.dom.metaDrawer.classList.toggle('in');
      this.dom.metaDrawer.classList.toggle('out');

      this.dom.content.classList.toggle('center');
      this.dom.content.classList.toggle('partialRight');

      Utils.runEventOnce(this.dom.metaDrawer, 'transitionend', function(){
        if (wasVisible){
          this.dom.currentMusicPage.classList.remove('hidden');
          this.dom.selectMusicPage.classList.remove('hidden');
          TransitionUtils.fadeOut(this.dom.contentOverlay, function(){
            this.locked = false;
          }.bind(this));
        }
        else {
          this.locked = false;
        }
      }.bind(this));
    }.bind(this);

    if (!wasVisible){
      this.dom.currentMusicPage.classList.add('hidden');
      TransitionUtils.fadeIn(this.dom.contentOverlay, function(){
        this.dom.selectMusicPage.classList.add('hidden');
        slide();
      }.bind(this));

    }
    else {
      slide(); 
    }

  },
  hideMetaDrawer: function(){
    if (this.dom.content.classList.contains('partialRight'))
      this.toggleMetaDrawer();
  },
  togglePlaylistDrawer: function(){
    if (this.locked)
      return;
    this.locked = true;

    var wasVisible = this.dom.content.classList.contains('partialLeft');

    var slide = function(){
      this.dom.playlistDrawer.classList.toggle('in');
      this.dom.playlistDrawer.classList.toggle('out');

      this.dom.content.classList.toggle('center');
      this.dom.content.classList.toggle('partialLeft');

      Utils.runEventOnce(this.dom.playlistDrawer, 'transitionend', function(){
        if (wasVisible){
          this.dom.selectMusicPage.classList.remove('hidden');
          this.dom.currentMusicPage.classList.remove('hidden');
          TransitionUtils.fadeOut(this.dom.contentOverlay, function(){
            this.locked = false;
          }.bind(this));
        }
        else {
          this.locked = false;
        }
      }.bind(this));
    }.bind(this);

    if (!wasVisible){
      this.dom.selectMusicPage.classList.add('hidden');
      TransitionUtils.fadeIn(this.dom.contentOverlay, function(){
        this.dom.currentMusicPage.classList.add('hidden');
        slide();
      }.bind(this));
    }
    else {
      slide();
    }

  },
  metaDrawerGotoSettings: function(){
    if (this.locked)
      return;
    this.locked = true;

    TransitionUtils.fadeOut(this.dom.gotoSettings, function(){
      TransitionUtils.fadeIn(this.dom.gotoSources);
    }.bind(this));
    TransitionUtils.fadeOut(this.dom.sourcesMetaDrawer, function(){
      TransitionUtils.fadeIn(this.dom.settingsMetaDrawer);
      Utils.runEventOnce(this.dom.settingsMetaDrawer, 'transitionend', function(){
        this.locked = false;
      }.bind(this));
    }.bind(this));
  },
  metaDrawerGotoSources: function(){
    if (this.locked)
      return;
    this.locked = true;

    TransitionUtils.fadeOut(this.dom.gotoSources, function(){
      TransitionUtils.fadeIn(this.dom.gotoSettings);
    }.bind(this));
    TransitionUtils.fadeOut(this.dom.settingsMetaDrawer, function(){
      TransitionUtils.fadeIn(this.dom.sourcesMetaDrawer);
      Utils.runEventOnce(this.dom.sourcesMetaDrawer, 'transitionend', function(){
        this.locked = false;
      }.bind(this));
    }.bind(this));
  },
  toggleCurrentMusicPageView: function(){
    if (this.locked)
      return;
    this.locked = true;

    if (this.dom.toggleCurrentMusicPageView.classList.contains('switchSong')){
      this.dom.currentSourceView.classList.remove('hidden');
      this.dom.currentPlaylistView.classList.add('hidden');
    }
    else {
      this.dom.currentSourceView.classList.add('hidden');
      this.dom.currentPlaylistView.classList.remove('hidden');
    }
    this.dom.toggleCurrentMusicPageView.classList.toggle('switchSong');

    this.locked = false;
  }
}

