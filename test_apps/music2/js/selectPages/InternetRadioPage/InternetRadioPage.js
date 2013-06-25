var InternetRadioPage = function(pageBridge){
  this.pageBridge = pageBridge;
  Utils.loadDomIds(this, [
      'internetRadioPage',
      'selectSourcePages',
      'internetRadioSearch',
      'internetRadioStations'
  ]);

  this.stations = new UIItemList(this.dom.internetRadioStations);

  this.dom.page = this.dom.internetRadioPage;

  this.icecast = new IcecastStationSearch();

  Utils.onButtonTap(this.dom.internetRadioSearch, function(){
    var search = prompt("search internet radio:");
    this.stations.empty();
    this.icecast.search(search, function(items){
      this.setStations(items);
    }.bind(this));
  }.bind(this));


}

InternetRadioPage.prototype = {
  name: "Internet Radio",
  setStations: function(stations){
    if (stations.length === 0){
      var text = Utils.classDiv('text');
      text.innerHTML = 'no stations found';
      this.dom.internetRadioStations.appendChild(text);
    }
    else {
      var items = stations.map(this.addStation.bind(this));
      items.forEach(this.stations.append.bind(this.stations));
    }
  },
  addStation: function(station){
    var content = Utils.classDiv('station');
    content.innerHTML = station.title;

    Utils.onButtonTap(content, function(){
      this.playM3U(station);
    }.bind(this));

    var item = new UIItem(null, content, null, null);

    return item;
  },
  playM3U: function(station){
    this.icecast.getM3UUrl(station.m3u, function(link){
      var source = new InternetAudioSource(station, link);
      this.pageBridge.createTemporaryPlaylistFromSources(station.title, [ source ]);
    }.bind(this));
  },
  unserialize: function(serializedSource){
    return new InternetAudioSource(serializedSource.station, serializedSource.url);
  },
  activate: function(){
    this.dom.selectSourcePages.removeChild(this.dom.page);
    this.pageBridge.setPageDiv(this.dom.page);
  },
  deactivate: function(){
    this.dom.page.parentNode.removeChild(this.dom.page);
    this.dom.selectSourcePages.appendChild(this.dom.page);
  },
  getStations: function(){
  }
}


