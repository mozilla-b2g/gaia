/* global View */
'use strict';

var ArtistsView = View.extend(function ArtistsView() {
  View.call(this); // super();

  this.searchBox = document.getElementById('search');
  this.list = document.getElementById('list');

  var searchHeight = this.searchBox.HEIGHT;

  this.searchBox.addEventListener('open', () => window.parent.onSearchOpen());
  this.searchBox.addEventListener('close', () => {
    this.list.scrollTop = searchHeight;
    window.parent.onSearchClose();
  });
  this.searchBox.addEventListener('search', (evt) => this.search(evt.detail));
  this.searchBox.addEventListener('resultclick', (evt) => {
    var link = evt.detail;
    if (link) {
      this.client.method('navigate', link.getAttribute('href'));
    }
  });

  this.searchBox.getItemImageSrc = (item) => {
    return this.getThumbnail(item.name);
  };

  this.list.scrollTop = searchHeight;
  this.list.minScrollHeight = `calc(100% - ${searchHeight}px)`;

  this.list.configure({
    getSectionName: (item) => {
      return item.sectionName;
    },

    getItemImageSrc: (item) => {
      return this.getThumbnail(item.name);
    }
  });

  this.client.on('databaseChange', () => this.update());

  this.update();
});

ArtistsView.prototype.update = function() {
  this.getArtists().then((artists) => {
    this.artists = artists;
    this.render();
  });
};

ArtistsView.prototype.destroy = function() {
  this.client.destroy();

  View.prototype.destroy.call(this); // super(); // Always call *last*
};

ArtistsView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  this.list.model = this.artists;
};

ArtistsView.prototype.getArtists = function() {
  return document.l10n.formatValues('unknownArtist', 'unknown')
    .then(([unknownArtist, unknown]) => {
      return this.fetch('/api/artists/list')
        .then(response => response.json())
        .then((artists) => {
          return artists.map((artist) => {
            // We create lighter weight objects for the model
            // With only what we need
            var sectionName, artistText;

            if (!artist.metadata.artist) {
              sectionName = unknown;
              artistText = unknownArtist;
            } else {
              sectionName = artist.metadata.artist[0].toLowerCase();
              sectionName = isNaN(sectionName) ? sectionName : '#';
              artistText = artist.metadata.artist;
            }

            return {
              sectionName: sectionName,
              name: artist.name,
              url: '/artist-detail?id=' + encodeURIComponent(artist.name),
              artist: artistText
            };
          });
        });
    });
};

ArtistsView.prototype.getThumbnail = function(filePath) {
  return this.fetch('/api/artwork/url/thumbnail/' + filePath)
    .then(response => response.json());
};

ArtistsView.prototype.search = function(query) {
  return document.l10n.formatValue('unknownArtist').then((unknownArtist) => {
    return this.fetch('/api/search/artist/' + query)
      .then(response => response.json())
      .then((artists) => {
        var results = artists.map((artist) => {
          return {
            name:     artist.name,
            title:    artist.metadata.artist || unknownArtist,
            subtitle: '',
            section:  'artists',
            url:      '/artist-detail?id=' + encodeURIComponent(artist.name)
          };
        });

        this.searchBox.setResults(results);
        return results;
      });
  });
};

window.view = new ArtistsView();
