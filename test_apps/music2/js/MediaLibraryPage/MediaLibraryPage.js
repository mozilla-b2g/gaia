var MediaLibraryPage = function(pageBridge){
  this.pageBridge = pageBridge;
  Utils.loadDomIds(this, [
      'mediaLibraryPage',
      'selectSourcePages'
  ]);
  this.dom.page = this.dom.mediaLibraryPage;

  this.notifications = new MediaLibraryPageNotifications();

  this.musicDB = new MusicDB();

  this.panelManager = new MediaLibraryPagePanelManager(this.musicDB, this.pageBridge);

  setTimeout(function(){
    if (!this.musicDB.ready){
      var title = document.createElement('div');
      title.innerHTML = 'Loading...';
      this.panelManager.dom.titleText.appendChild(title);
    }
  }.bind(this), 1000);

  this.musicDB.onisReady = function(){
    this.startPanel = new MediaLibraryPagePanel();
    this.panelManager.panels.push(this.startPanel); 
    var discoverPanel = this.startPanel.getSubcategoryPanel('Discover');
    this.panelManager.pushPanel(discoverPanel);
    this.notifications.alert('scanning sd card', 2000);
  }.bind(this);

  this.musicDB.onmusicDeleted = function(event){
    this.notifications.alert('removed: ' + event.detail[0].metadata.title, 2000);
  }.bind(this);

  this.musicDB.onmusicCreated = function(event){
    this.notifications.alert('found: ' + event.detail[0].metadata.title, 2000);
  }.bind(this);

  this.musicDB.onmusicChanged = this.musicChanged.bind(this);
}

MediaLibraryPage.prototype = {
  name: "Music Library",
  musicChanged: function(numberCreated, numberDeleted){
    if (window.localStorage.hasBeenLaunched){
      this.notifications.askForRefresh(numberCreated, numberDeleted, function(){

        var hideNotification = null;
        var onDone = function(){
          if (hideNotification)
            hideNotification();
        }
        this.panelManager.refresh(onDone);

        this.notifications.hide();

        setTimeout(function(){
          hideNotification = this.showRefreshing();
        }.bind(this), 500);
      }.bind(this));
    }
    else {
      window.localStorage.hasBeenLaunched = true;
      var onDone = this.showRefreshing();
      this.panelManager.refresh(onDone);
    }
  },
  showRefreshing: function(){
      this.notifications.alert('refreshing music...');
      return this.notifications.hide.bind(this.notifications);
  },
  unserialize: function(serializedSource){
    return new FileAudioSource(this.musicDB, serializedSource);
  },
}
