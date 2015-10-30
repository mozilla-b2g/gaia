/* global View */
'use strict';

var PlaylistsView = View.extend(function PlaylistsView() {
  View.call(this); // super();

  this.searchBox = document.getElementById('search-box');
  this.searchResults = document.getElementById('search-results');
  this.list = document.getElementById('list');

  this.searchBox.addEventListener('search', (evt) => this.search(evt.detail));

  this.searchResults.addEventListener('open', () => {
    this.client.method('searchOpen');
  });

  this.searchResults.addEventListener('close', () => {
    this.client.method('searchClose');
    this.list.scrollTop = this.searchBox.HEIGHT;
  });

  this.searchResults.addEventListener('resultclick', (evt) => {
    var link = evt.detail;
    if (link) {
      if (link.dataset.section === 'songs') {
        this.queueSong(link.dataset.filePath);
      }

      this.client.method('navigate', link.getAttribute('href'));
    }
  });

  this.searchResults.getItemImageSrc = (item) => this.getThumbnail(item.name);

  this.list.minScrollHeight = `calc(100% + ${this.searchBox.HEIGHT}px)`;
  this.list.offset = this.searchBox.HEIGHT;

  this.list.addEventListener('click', (evt) => {
    var link = evt.target.closest('a[data-shuffle="true"]');
    if (link) {
      evt.preventDefault();
      evt.stopPropagation();

      this.queuePlaylist(link.dataset.id);

      this.client.method('navigate', '/player');
    }
  });

  this.client.on('databaseChange', () => this.update());

  this.update()
    .then(() => this.list.scrollTo(this.searchBox.HEIGHT));
});

PlaylistsView.prototype.update = function() {
  return this.getPlaylists().then((playlists) => {
    return Promise.all(playlists.map((playlist) => {
        return document.l10n.formatValue('playlists-' + playlist.id);
      }))

      .then((titles) => {
        titles.forEach((title, index) => playlists[index].title = title);
        this.playlists = playlists;
        return this.render();
      });
  });
};

PlaylistsView.prototype.destroy = function() {
  this.client.destroy();
  View.prototype.destroy.call(this); // super(); // Always call *last*
};

PlaylistsView.prototype.render = function() {
  View.prototype.render.call(this); // super();
  return this.list.setModel(this.playlists);
};

PlaylistsView.prototype.getPlaylists = function() {
  return this.fetch('/api/playlists/list').then(response => response.json());
};

PlaylistsView.prototype.queuePlaylist = function(id) {
  this.fetch('/api/queue/playlist/' + id + '/shuffle');
};

PlaylistsView.prototype.queueSong = function(filePath) {
  this.fetch('/api/queue/song/' + filePath);
};

PlaylistsView.prototype.getThumbnail = function(filePath) {
  return this.fetch('/api/artwork/url/thumbnail/' + filePath)
    .then(response => response.json());
};

PlaylistsView.prototype.search = function(query) {
  if (!query) {
    return Promise.resolve(this.searchResults.clearResults());
  }

  var results = [];

  return document.l10n.formatValues(
    'unknownTitle', 'unknownArtist', 'unknownAlbum'
  ).then(([unknownTitle, unknownArtist, unknownAlbum]) => {
    var albumResults = this.fetch('/api/search/album/' + query)
      .then(response => response.json())
      .then((albums) => {
        var albumResults = albums.map((album) => {
          return {
            name:     album.name,
            title:    album.metadata.album  || unknownAlbum,
            subtitle: album.metadata.artist || unknownArtist,
            section:  'albums',
            url:      '/album-detail?id=' + encodeURIComponent(album.name)
          };
        });

        results = results.concat(albumResults);

        this.searchResults.setResults(results);
        return albumResults;
      });

    var artistResults = this.fetch('/api/search/artist/' + query)
      .then(response => response.json())
      .then((artists) => {
        var artistResults = artists.map((artist) => {
          return {
            name:     artist.name,
            title:    artist.metadata.artist || unknownArtist,
            subtitle: '',
            section:  'artists',
            url:      '/artist-detail?id=' + encodeURIComponent(artist.name)
          };
        });

        results = results.concat(artistResults);

        this.searchResults.setResults(results);
        return artistResults;
      });

    var songResults = this.fetch('/api/search/title/' + query)
      .then(response => response.json())
      .then((songs) => {
        var songResults = songs.map((song) => {
          return {
            name:     song.name,
            title:    song.metadata.title  || unknownTitle,
            subtitle: song.metadata.artist || unknownArtist,
            section:  'songs',
            url:      '/player'
          };
        });

        results = results.concat(songResults);

        this.searchResults.setResults(results);
        return songResults;
      });

    return Promise.all([albumResults, artistResults, songResults]).then(() => {
      return results;
    });
  });
};

window.view = new PlaylistsView();
