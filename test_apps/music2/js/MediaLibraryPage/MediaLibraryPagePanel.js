
var MediaLibraryPagePanel = function(title, select, config, stage, view){
  this.title = title;
  if (this.title === null || this.title === undefined)
    this.title = 'Music Library';
  this.query = config || {
    'genre': '*',
    'artist': '*',
    'album': '*',
    'song': '*'
  };
  this.select = select || null;
  this.stage = stage || 'home';
  this.view = view || 'list';
}

MediaLibraryPagePanel.prototype = {
  getSubcategoryPanel: function(subCategory){
    var config = {};
    config.genre = this.query.genre;
    config.artist = this.query.artist;
    config.album = this.query.album;
    config.song = this.query.song;

    var view = undefined;
    if (subCategory === 'Discover')
      view = 'album';

    var select = subCategory;
    var title = subCategory;

    return new MediaLibraryPagePanel(title, select, config, 'filter', view);
  },
  getItemPanel: function(item, selectOverride){

    var switchSelect = selectOverride || this.select;

    var config = {};
    config.genre = this.query.genre;
    config.artist = this.query.artist;
    config.album = this.query.album;
    config.song = this.query.song;
    var select = null;
    var title = item;

    if (switchSelect === 'Genres'){
      config.genre = item;
      config.song = '*';
    }
    else if (switchSelect === 'Artists'){
      config.artist = item;
      config.song = '*';
    }
    else if (switchSelect === 'Albums'){
      config.album = item;
      config.song = '*';
    }
    else {
      config.song = item;
    }
    return new MediaLibraryPagePanel(title, select, config, 'filter');
  }
}
