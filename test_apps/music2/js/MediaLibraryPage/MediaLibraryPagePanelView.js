var MediaLibraryPagePanelView = function(musicDB, panel, done, readyToSet){

  this.done = done;
  this.readyToSet = readyToSet;

  this.musicDB = musicDB;
  Utils.loadDomIds(this, [
      "mediaLibraryPagePanel",
      "mediaLibraryPagePanelTitle",
      "mediaLibraryPagePanelTitleText",
      "mediaLibraryPagePanelList",
      "mediaLibraryPagePanelSubCategories",
      "mediaLibraryPagePanelItems",
      "mediaLibraryPagePanelPop",

      "mediaLibraryPagePanelAlbum",
      "mediaLibraryPagePanelControls",
      "mediaLibraryPagePanelControlPlay",
      "mediaLibraryPagePanelControlAdd"
  ]);

  this.dom.panel = this.dom.mediaLibraryPagePanel;
  this.dom.title = this.dom.mediaLibraryPagePanelTitle;
  this.dom.titleText = this.dom.mediaLibraryPagePanelTitleText;
  this.dom.subCategories = this.dom.mediaLibraryPagePanelSubCategories;
  this.dom.items = this.dom.mediaLibraryPagePanelItems;


  this.dom.albumCover = this.dom.mediaLibraryPagePanelAlbum;
  this.dom.controls = this.dom.mediaLibraryPagePanelControls;
  this.dom.controlPlay = this.dom.mediaLibraryPagePanelControlPlay;
  this.dom.controlAdd = this.dom.mediaLibraryPagePanelControlAdd;

  this.dom.itemList = new UIItemList(this.dom.items);

  this.inactive = false;

  this.genreKnown = panel.query.genre !== '*';
  this.artistKnown = panel.query.artist !== '*';
  this.albumKnown = panel.query.album !== '*';
  this.songKnown = panel.query.song !== '*';

  Utils.setupPassParent(this, 'gotoSubcategory');
  Utils.setupPassParent(this, 'gotoItem');
  Utils.setupPassParent(this, 'playSong');
  Utils.setupPassParent(this, 'addSong');
  Utils.setupPassParent(this, 'addSongToCustom');
  
  this.panel = panel;

  this.songs = [];

  console.log('\n=====================================================' + '\n' +
  'query: ' + JSON.stringify(this.panel.query, null, 2) + '\n' + 
  'select: ' + this.panel.select + '\n' + 
  '=====================================================');

  this.prepPanel();
}

MediaLibraryPagePanelView.prototype = {
  prepPanel: function(){
    if (this.panel.select === 'Genres'){
      this.musicDB.getGenres(this.gotPrepResults.bind(this));
    }
    else if (this.panel.select === 'Artists'){
      this.musicDB.getArtists(this.panel.query.genre, this.gotPrepResults.bind(this));
    }
    else if (this.panel.select === 'Albums'){
      this.musicDB.getAlbums(
        this.panel.query.genre, 
        this.panel.query.artist, 
        this.gotPrepResults.bind(this));
    }
    else if (this.songKnown){
      this.musicDB.getSong(this.panel.query.song, this.gotPrepResults.bind(this));
    }
    else if (this.panel.select === 'Discover'){
      this.musicDB.getAlbums(
        this.panel.query.genre, 
        this.panel.query.artist, 
        function(items){
          Utils.shuffleArray(items);
          items.splice(9, Math.max(items.length-10, 0));
          this.gotPrepResults(items);
        }.bind(this));
    }
    else {
      if (this.panel.stage === 'filter') {
        this.musicDB.getSongs(
            this.panel.query.genre, 
            this.panel.query.artist,
            this.panel.query.album,
            this.gotPrepResults.bind(this));
      }
      else {
        setTimeout(function(){
          this.gotPrepResults([]);
        }.bind(this), 0);
      }
    }
  },
  gotPrepResults: function(items){
    this.items = items;
    this.readyToSet();
  },
  setPanel: function(){

    this.setTitle();
    this.setSubcategories();

    this.fields = [];

    if ((this.panel.select === undefined || this.panel.select === null) && 
        (this.genreKnown || this.artistKnown || this.albumKnown || this.songKnown)
    ){
      this.setTitleToControlView(null, this.albumKnown, false);
    }

    this.dom.itemList.empty();
    if (this.panel.select === 'Genres'){
      this.fields.push('genre');
      this.setItems(this.items);
    }
    else if (this.panel.select === 'Artists'){
      this.fields.push('artist');
      this.setItems(this.items);
    }
    else if (this.panel.select === 'Albums'){
      this.fields.push('album', 'artist');
      this.setItems(this.items);
    }
    else if (this.songKnown){
      this.setSongPage(this.items);
    }
    else {
      this.fields.push('title', 'artist', 'album');
      this.setItems(this.items);
    }

  },
  setTitle: function(){
    Utils.empty(this.dom.titleText);
    var title = document.createElement('div');
    if (this.albumKnown)
      title.innerHTML = this.panel.title || 'Unknown Album';
    else if (this.artistKnown)
      title.innerHTML = this.panel.title || 'Unknown Artist';
    else
      title.innerHTML = this.panel.title;
    this.currentTitle = this.panel.title 
    this.dom.titleText.appendChild(title);

    this.dom.mediaLibraryPagePanelList.style.top = '4rem';

    this.dom.controls.classList.add('hidden');
    this.dom.controls.classList.remove('right');
    this.dom.albumCover.classList.add('hidden');
    this.dom.titleText.classList.remove('right');

  },
  addSubtitle: function(text){
    var subtitle = document.createElement('div');
    subtitle.innerHTML = text;
    this.dom.titleText.appendChild(subtitle);
  },
  setSubcategories: function(){
    Utils.empty(this.dom.subCategories);
    this.dom.subCategories.classList.add('hidden');

    this.subCategoryDivs = {};

    if (this.panel.select === null){
      if (!this.genreKnown && (!this.albumKnown && !this.artistKnown && !this.songKnown)){
        this.addSubCategory('Genres');
      }
      if (!this.artistKnown){
        this.addSubCategory('Artists');
      }
      if (!this.albumKnown){
        this.addSubCategory('Albums');
      }
    }
    if (this.panel.stage === 'home'){
      this.addSubCategory('Discover');
      this.addSubCategory('All Songs');
    }
  },
  addSubCategory: function(text){
    var subCategory = document.createElement('div');
    Utils.onButtonTap(subCategory, function(){
      this.gotoSubcategory(text);
    }.bind(this));
    subCategory.innerHTML = text;
    subCategory.classList.add('gotoPanelButton');
    this.dom.subCategories.appendChild(subCategory);
    this.subCategoryDivs[text] = subCategory;
  },
  setItems: function(items){
    var genres = {};
    var artists = {};
    var albums = {};
    for (var i = 0; i < items.length; i++){
      var item = items[i];
      genres[item.metadata.genre] = item;
      artists[item.metadata.artist] = item;
      albums[item.metadata.album] = item;
    }
    this.rerenderCategories(genres, artists, albums);
    if (Utils.size(artists) === 1){
      this.artistKnown = true;
    }
    if (Utils.size(albums) === 1){
      this.albumKnown = true;
    }

    if ((this.panel.select === undefined || this.panel.select === null) && 
        (this.genreKnown || this.artistKnown || this.albumKnown || this.songKnown)
    ){
      this.setTitleToControlView(items[0], this.albumKnown, true);
    }


    var titleHeight = this.dom.title.clientHeight;
    if (titleHeight !== 0)
      this.dom.mediaLibraryPagePanelList.style.top = titleHeight + 'px'

    setTimeout(function(){
      this.renderItems(items); 
    }.bind(this), 0);
  },
  renderItems: function(items){
    var sortFields = [];
    if (this.panel.select === 'Genres')
      sortFields.push('genre');
    else if (this.panel.select === 'Albums')
      sortFields.push('album');
    else if (this.panel.select === 'All Songs')
      sortFields.push('title');
    else
      sortFields.push('artist', 'album', 'tracknum', 'title');

    if (this.panel.select !== 'Discover'){
      items.sort(this.makeItemSorter(sortFields));
    }
    if (!this.panel.select){
      this.songs = items;
    }

    this.dom.items.style.minHeight = items.length*4 + 'rem';

    var MAX_ITEMS_SYNCHRONOUS = 30; // determined experimentally
    var renderItem;
    if (this.panel.view === 'list'){
      renderItem = this.renderListItem.bind(this);
    }
    else if (this.panel.view === 'album'){
      renderItem = this.renderAlbumItem.bind(this);
    }
    if (items.length > MAX_ITEMS_SYNCHRONOUS){ 

      var i = 0;
      var jSize = 40;
      var next = function(){
        if (i >= items.length || this.inactive){
          this.dom.items.style.minHeight = 0;
          return;
        }
        for (var j = 0; j < jSize && i+j < items.length; j++){
          var item = items[i+j];
          renderItem(item);
        }
        jSize = Math.max(jSize/2, 5);
        i += j;
        setTimeout(next, 0);
      }.bind(this);
      setTimeout(next, 0);
      if (this.done) 
        this.done();
    }
    else {
      for (var i = 0; i < items.length; i++){
        var item = items[i];
        renderItem(item);
      }
      this.dom.items.style.minHeight = 0;
      if (this.done) 
        this.done();
    }
  },
  renderListItem: function(item){
    var content = document.createElement('div');
    content.classList.add('fields');
    for (var j = 0; j < this.fields.length; j++){
      if (!this.panel.select){
        if (this.genreKnown && this.fields[j] === 'genre')
          continue;
        if (this.artistKnown && this.fields[j] === 'artist')
          continue;
        if (this.albumKnown && this.fields[j] === 'album')
          continue;
      }
      var fieldDiv = document.createElement('div');
      var field = item.metadata[this.fields[j]];
      if (this.fields[j] === 'genre')
        field = field || 'Unknown Genre';
      if (this.fields[j] === 'artist')
        field = field || 'Unknown Artist';
      if (this.fields[j] === 'album')
        field = field || 'Unknown Album';
      fieldDiv.innerHTML = field;
      content.appendChild(fieldDiv);
    }

    var icon = null;
    if (!this.panel.select && (this.artistKnown || this.albumKnown) && item.metadata.tracknum >= 0){
      icon = document.createElement('div');
      icon.classList.add('track');
      icon.innerHTML = item.metadata.tracknum;
    }
    else if (this.panel.select === 'Albums'){
      icon = document.createElement('img');
      icon.classList.add('albumCover');
      icon.onerror="this.src='';";
      this.musicDB.getAlbumArtAsURL(item, function(url){
        icon.src = url;
      }.bind(this));
    }

    if (this.panel.select){
      var gotoPanelButton = Utils.classDiv('gotoPanelButton');
      var target = item.metadata[this.fields[0]];
      Utils.onButtonTap(gotoPanelButton, function(){
        this.gotoItem(target);
      }.bind(this));
      gotoPanelButton.appendChild(content);

      var item = new UIItem(icon, gotoPanelButton, null, null);
      this.dom.itemList.append(item);
      if (this.panel.select === 'Albums'){
        item.dom.content.classList.add('right');
      }
    }
    else {
      Utils.onButtonTap(content, function(){
        this.gotoItem(item.metadata.title);
        //this.playSong(item);
      }.bind(this));

      var add = Utils.classDiv('add');
      Utils.onButtonLongTap(add, function(){
        this.addSong(item);
      }.bind(this), function(){
        this.addSongToCustom(item);
      }.bind(this));

      var uiItem = new UIItem(icon, content, null, add);
      this.dom.itemList.append(uiItem);
    }
  },
  renderAlbumItem: function(item){
    var content = Utils.classDiv('album');

    var img = document.createElement('img');
    img.onerror="this.src='';";
    this.musicDB.getAlbumArtAsURL(item, function(url){
      img.src = url;
    }.bind(this));
    content.appendChild(img);

    var text = Utils.classDiv('text');
    text.innerHTML = item.metadata.album;
    content.appendChild(text);

    var target = item.metadata.album;
    Utils.onButtonTap(content, function(){
      this.gotoItem(target, 'Albums');
    }.bind(this));

    var item = new UIItem(null, content, null, null);
    this.dom.itemList.append(item);
    item.dom.div.classList.add('albumItem');

    //var content = Utils.classDiv('fields');
    //var fieldDiv = document.createElement('div');
    //fieldDiv.innerHTML = item.metadata.album || 'Unknown Genre';
    //content.appendChild(fieldDiv);

    //var icon = document.createElement('img');
    //icon.classList.add('albumCover');
    //icon.onerror="this.src='';";
    //this.musicDB.getAlbumArtAsURL(item, function(url){
    //  icon.src = url;
    //}.bind(this));

    //var gotoPanelButton = Utils.classDiv('gotoPanelButton');
    //var target = item.metadata.album;
    //Utils.onButtonTap(gotoPanelButton, function(){
    //  this.gotoItem(target, 'Albums');
    //}.bind(this));
    //gotoPanelButton.appendChild(content);

    //var item = new UIItem(icon, gotoPanelButton, null, null);
    //this.dom.itemList.append(item);
    //item.dom.content.classList.add('right');
  },
  setupOnTapOverridedSubcategory: function(div, item, override){
    Utils.onButtonTap(div, function(){
      this.gotoItem(item, override);
    }.bind(this));
  },
  rerenderCategories: function(genres, artists, albums){
    var numArtists = Utils.size(artists);
    var numAlbums = Utils.size(albums);

    if (numAlbums > 0 && numAlbums <= 3 && this.subCategoryDivs.Albums){
      this.subCategoryDivs.Albums.parentNode.removeChild(this.subCategoryDivs.Albums);
      if (numAlbums > 1){
        for (var album in albums){
          var subCategory = document.createElement('div');
          this.setupOnTapOverridedSubcategory(subCategory, album, 'Albums');
          subCategory.classList.add('gotoPanelButton');
          subCategory.innerHTML = album || 'Unknown Album';
          subCategory.item = album;
          this.dom.subCategories.appendChild(subCategory);

          var icon = document.createElement('img');
          icon.classList.add('albumCover');
          icon.onerror="this.src='';";
          this.musicDB.getAlbumArtAsURL(albums[album], function(url){
            icon.src = url;
          }.bind(this));
          subCategory.appendChild(icon);
          subCategory.classList.add('hasAlbumCover');

        }
      }
      else {
        for (var album in albums){
          this.addSubtitle(album || 'Unknown Album');
        }
      }
    }
    if (numArtists > 0 && numArtists <= 3 && this.subCategoryDivs.Artists){
      this.subCategoryDivs.Artists.parentNode.removeChild(this.subCategoryDivs.Artists);
      if (numArtists > 1){
        for (var artist in artists){
          var subCategory = document.createElement('div');
          this.setupOnTapOverridedSubcategory(subCategory, artist, 'Artists');
          subCategory.classList.add('gotoPanelButton');
          subCategory.innerHTML = artist || 'Unknown Artist';
          subCategory.item = artist;
          this.dom.subCategories.appendChild(subCategory);
        }
      }
      else {
        for (var artist in artists){
          this.addSubtitle(artist || 'Unknown Artist');
        }
      }
    }
    this.dom.subCategories.classList.remove('hidden');
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
  setSongPage: function(song){

    this.songs = [ song ];

    this.setTitleToControlView(song, true, true);

    if (!this.artistKnown){
      this.addLink('see artist ' + (song.metadata.artist || 'Unknown Artist'), 'Artists', song.metadata.artist);
    }

    if (!this.albumKnown){
      this.addLink('see album ' + (song.metadata.album || 'Unknown Album'), 'Albums', song.metadata.album);
    }
  },
  addLink: function(description, type, target){
    var link = Utils.classDiv('gotoPanelButton');
    var text = Utils.classDiv('fields');
    text.innerHTML = description;
    link.appendChild(text);
    var item = new UIItem(null, link, null, null);
    this.dom.itemList.append(item);
    Utils.onButtonTap(link, function(){
      this.gotoItem(target, type);
    }.bind(this));
  },
  setTitleToControlView: function(song, albumKnown, loaded){
    this.dom.controls.classList.remove('hidden');
    if (albumKnown){
      this.dom.controls.classList.add('right');
      this.dom.albumCover.classList.remove('hidden');
      this.dom.titleText.classList.add('right');
      this.dom.albumCover.src = '';
      if (song !== null){
        this.musicDB.getAlbumArtAsURL(song, function(url){
          this.dom.albumCover.src = url;
        }.bind(this));
      }
    }

    if (loaded){
      this.dom.controls.classList.remove('disabled');
      this.dom.mediaLibraryPagePanelControlPlay.disabled = false;
      this.dom.mediaLibraryPagePanelControlAdd.disabled = false;
    }
    else {
      this.dom.controls.classList.add('disabled');
      this.dom.mediaLibraryPagePanelControlPlay.disabled = true;
      this.dom.mediaLibraryPagePanelControlAdd.disabled = true;
    }
    var titleHeight = this.dom.title.clientHeight;
    if (titleHeight !== 0)
      this.dom.mediaLibraryPagePanelList.style.top = titleHeight + 'px'
  }
}
