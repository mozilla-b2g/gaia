
var Wallpaper = {
  init: function wp_init() {
    this.activityListener();
    window.addEventListener('click', this);
    window.addEventListener('mozvisibilitychange', this);
    window.addEventListener('resize', this);
  },
  handleEvent: function wp_handleEvent(evt) {
    switch(evt.type) {
      case 'mozvisibilitychange':
        this.cancelPick();
        break;
      case 'click':
        var target = evt.target;
        if (!target || !target.classList.contains('thumbnail'))
          return;
        break;
    }
  },
  activityListener: function wp_activityListener() {
    navigator.mozSetMessageHandler('activity', function(activityRequest) {
      if (this.pendingPick)
        this.cancelPick();
      
      var activityName = activityRequest.source.name;
      
      switch (activityName) {
        case 'pick':
          this.startPick(activityRequest);
          break;
      }
    });
  },
  startPick: function wp_startPick(activityRequest) {
    this.pendingPick = activityRequest;
    this.setView(pickView);
  },
  finishPick: function wp_finishPick(filename) {
    this.pendingPick.postResult({
      type: 'image/jpeg',
      filename: filename
    });
    this.pendingPick = null;
    this.setView(thumbnailListView);
  },
  cancelPick: function wp_cancelPick() {
    this.pendingPick.postError('pick cancelled');
    this.pendingPick = null;
    this.setView(thumbnailListView);
  }
};

Wallpaper.init();
