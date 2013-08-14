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

    Router.route(panel, 'pop');
    Utils.onButtonTap(panel.dom.back, function(){
      panel.pop();
    });
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
      fieldDiv.innerHTML = field;
      content.appendChild(fieldDiv);
    }

    var icon = null;
    if (config.showTrack){
      icon = document.createElement('div');
      icon.classList.add('track');
      icon.innerHTML = config.song.metadata.tracknum;
    }

    Utils.onButtonLongTap(content, config.ontap, config.onlongTap);

    var more = null;
    if (!config.hideAdd){
      content.classList.add('add');
      //var more = Utils.classDiv('add');
      //Utils.onButtonLongTap(more, config.onadd, config.oncustomAdd);
    }

    var uiItem = new UIItem(icon, content, null, null);
    uiItem.createDiv();
    uiItem.dom.div.classList.add('song');
    return uiItem;
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
      fieldDiv.innerHTML = field;
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
    //  this.query[config.fields[0]] = target;
    //  this.requestMusicPanel(config.query);
    //}.bind(this));
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
