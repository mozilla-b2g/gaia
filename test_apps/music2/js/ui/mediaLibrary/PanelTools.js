var PanelTools = {
  setupDom: function(panel){
    panel.dom = {
      panel: document.createElement('div'),
      title: document.createElement('div'),
      titleText: document.createElement('div'),
      content: document.createElement('div'),
      items: document.createElement('div'),
      back: document.createElement('div'),
    }
    panel.dom.panel.classList.add('panel');
    panel.dom.title.classList.add('title');
    panel.dom.titleText.classList.add('titleText');
    panel.dom.content.classList.add('content');
    panel.dom.items.classList.add('items');
    panel.dom.back.classList.add('back');

    panel.dom.title.appendChild(panel.dom.back);
    panel.dom.title.appendChild(panel.dom.titleText);

    panel.dom.content.appendChild(panel.dom.items);

    panel.dom.panel.appendChild(panel.dom.title);
    panel.dom.panel.appendChild(panel.dom.content);

    panel.itemsList = new UIItemList(panel.dom.items);

    panel.router = new Router(panel);

    panel.router.declareRoutes([
      'pop',
      'requestPlaySongs',
      'requestAddSongs',
      'requestAddSongsToCustom',
      'switchPlayingToIndex',
      'shareSong'
    ]);

    panel.extraOptions = new SongExtraOptions({
      list: panel.dom.items,
      draggable: false
    });

    Utils.onButtonTap(panel.dom.back, function(){
      panel.router.route('pop')();
    });
  },
  setTitle: function(panel, title){
    var titleNode = document.createElement('div');
    titleNode.textContent = title;
    panel.dom.titleText.appendChild(titleNode);
  },
  setSubtitle: function(panel, subtitle){
    var subtitleNode = document.createElement('div');
    subtitleNode.textContent = subtitle;
    panel.dom.titleText.appendChild(subtitleNode);
  },
  makeItemSorter: function(fields){
    return function(a, b){
      for (var i = 0; i < fields.length; i++){
        var field = fields[i];
        if (a.metadata[field] !== b.metadata[field])
          return Utils.strCmp(a.metadata[field], b.metadata[field]);
      }
      return false;
    }
  },
  renderSong: function(config){
    var content = document.createElement('div');
    content.classList.add('fields');
    for (var j = 0; j < config.fields.length; j++){
      if (config.known.genre && config.fields[j] === 'genre')
        continue;
      if (config.known.artist && config.fields[j] === 'artist')
        continue;
      if (config.known.album && config.fields[j] === 'album')
        continue;
      if (config.known.title && config.fields[j] === 'title')
        continue;
      var fieldDiv = document.createElement('div');
      var field = config.song.metadata[config.fields[j]];
      if (config.fields[j] === 'genre')
        field = field || 'Unknown Genre';
      if (config.fields[j] === 'artist')
        field = field || 'Unknown Artist';
      if (config.fields[j] === 'album')
        field = field || 'Unknown Album';
      fieldDiv.textContent = field;
      content.appendChild(fieldDiv);
    }

    var icon = document.createElement('div');
    icon.classList.add('songInfo');
    if (config.showTrack){
      var track = document.createElement('div');
      track.classList.add('track');
      track.textContent = config.song.metadata.tracknum;
      icon.appendChild(track);
    }
    var favorited = document.createElement('div');
    favorited.classList.add('favorited');
    icon.appendChild(favorited);

    var updateFavorited = function(isFavorite){
      if (isFavorite)
        favorited.classList.add('favorite');
      else 
        favorited.classList.remove('favorite');
    }
    updateFavorited(config.song.metadata.favorited);

    var clearListener = window.musicLibrary.musicDB.registerSongFavoriteChangeListener(config.song, updateFavorited);

    Utils.onButtonLongTap(content, config.ontap, function(){
      config.extraOptions.show({
        elem: uiItem.dom.div,
        addTo: config.addTo,
        toggleFavorite: config.toggleFavorite,
        drag: config.drag,
        share: config.share
      }, config.song);
    });
    var more = null;
    if (!config.hideAdd){
      content.classList.add('add');
    }

    var uiItem = new UIItem(icon, content, null, null);
    uiItem.createDiv();
    uiItem.dom.div.classList.add('song');

    uiItem.on('destroy', function(){
      clearListener();
    });
    return uiItem 
  },
  renderGotoPanel: function(config){
    var content = document.createElement('div');
    content.classList.add('fields');
    for (var j = 0; j < config.fields.length; j++){
      var fieldDiv = document.createElement('div');
      var field = config.song.metadata[config.fields[j]];
      if (config.fields[j] === 'genre')
        field = field || 'Unknown Genre';
      if (config.fields[j] === 'artist')
        field = field || 'Unknown Artist';
      if (config.fields[j] === 'album')
        field = field || 'Unknown Album';
      fieldDiv.textContent = field;
      content.appendChild(fieldDiv);
    }

    var icon = null;
    if (config.category === 'Albums'){
      icon = document.createElement('img');
      icon.classList.add('albumCover');
      icon.onerror="this.src='';";
      window.musicLibrary.musicDB.getAlbumArtAsURL(config.song, function(url){
        icon.src = url;
      });
    }

    var gotoPanelButton = Utils.classDiv('gotoPanelButton');
    var target = config.song.metadata[config.fields[0]];
    Utils.onButtonTap(gotoPanelButton, config.ontap);//function(){
    gotoPanelButton.appendChild(content);

    var item = new UIItem(icon, gotoPanelButton, null, null);
    item.createDiv();
    if (config.category === 'Albums'){
      item.dom.content.classList.add('right');
    }
    return item;
  },
  renderItems: function(itemsList, items, done){
    var MAX_ITEMS_SYNCHRONOUS = 30; // determined experimentally
    if (items.length > MAX_ITEMS_SYNCHRONOUS){ 

      var i = 0;
      var jSize = 40;
      var next = function(){
        if (i >= items.length){
          return;
        }
        for (var j = 0; j < jSize && i+j <items.length; j++){
          var item = items[i+j];
          itemsList.append(item);
        }
        i += j;
        jSize = Math.max(jSize/2, 5);
        setTimeout(next, 0);
      };
      setTimeout(next, 0);
      if (done) 
        done();
    }
    else {
      for (var i = 0; i < items.length; i++){
        var item = items[i];
        itemsList.append(item);
      }
      if (done) 
        done();
    }
  }
}
