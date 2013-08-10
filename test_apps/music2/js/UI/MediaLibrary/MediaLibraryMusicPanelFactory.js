var MediaLibraryMusicPanelFactory = {
  createMediaLibraryMusicPanel: function(query, items, mode){
    var genres = {};
    var artists = {};
    var albums = {};
    for (var i = 0; i < items.length; i++){
      var item = items[i];
      genres[item.metadata.genre] = item;
      artists[item.metadata.artist] = item;
      albums[item.metadata.album] = item;
    }
    var genreKnown = Utils.size(genres) === 1;
    var artistKnown = Utils.size(artists) === 1;
    var albumKnown = Utils.size(albums) === 1;

    if (albumKnown){
      return new MediaLibraryAlbumPanel(mode, items, artistKnown);
    }
    else if (artistKnown){
      return new MediaLibraryArtistPanel(mode, items, albums);
    }
    else if (this._matchAll(query)){
      return new MediaLibraryAllMusicPanel(mode, items);
    }
    else if (genreKnown){
      for (var genre in genres);
      return new MediaLibraryCategoryPanel(genre, 'Artists', {
        'genre': genre,
        'artist': '*',
        'album': '*',
        'song': '*'
      });
    }
  },
  _matchAll: function(query){
    return query.genre === '*' &&
           query.artist === '*' &&
           query.album === '*' &&
           query.song === '*';
  }
}
