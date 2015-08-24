/* global bridge, View */
'use strict';

/**
 * Mini Logger
 *
 * @type {Function}
 * @private
 */
var debug = View.debug('HomeView');

/**
 * Initialize a new `HomeView`
 *
 * @constructor
 * @extends View
 */
var HomeView = View.extend(function HomeView() {
  View.call(this); // super();

  this.tiles = [];
  this.els = {
    search: document.getElementById('search'),
    tiles: document.getElementById('tiles')
  };

  // TODO: We shouldn't have hard dependencies on outside state
  this.els.search.addEventListener('open', () => window.parent.onSearchOpen());
  this.els.search.addEventListener('close', () => window.parent.onSearchClose());

  this.els.tiles.addEventListener('click', (evt) => {
    var link = evt.target.closest('a[data-file-path]');
    if (link) this.queueAlbum(link.dataset.filePath);
  });

  this.client.on('databaseChange', () => this.update());

  this.renderPlaceholders(10);
  this.update();

  debug('initialized');
});

/**
 * Gets fresh data and re-renders
 * the entire list.
 *
 * @private
 */
HomeView.prototype.update = function() {
  this.getAlbums().then((albums) => {
    debug('got albums', albums);
    this.albums = albums;
    this.render();
  });
};

/**
 * The title displayed in the
 * main app chrome header.
 *
 * @type {String}
 */
HomeView.prototype.title = 'Music';

/**
 * Renders a tile for each album.
 *
 * If the isn't a spare tiel for the album
 * a new one will be made. Empty tiles
 * will be cleaned up at the end.
 *
 * @private
 */
HomeView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  this.albums.forEach((album, i) => {
    var tile = this.tiles[i] || this.createTile();
    var root = tile.root;

    root.href = `/player?id=${album.name}`;
    tile.artist.textContent = `${album.metadata.artist}`;
    tile.album.textContent = `${album.metadata.album}`;
    root.dataset.filePath = `${album.name}`;
    root.classList.add('populated');

    if (!root.parentNode) this.els.tiles.appendChild(root);
  });

  this.cleanEmptyTiles();
  this.renderImages();
};

/**
 * Because we recycle the tiles, there can
 * sometimes be more tiles than albums.
 *
 * This method removes redundant tiles
 * from the DOM and this.tiles list.
 *
 * @private
 */
HomeView.prototype.cleanEmptyTiles = function() {
  debug('clean empty tiles');
  var empty = this.tiles.splice(this.albums.length);
  empty.forEach(tile => tile.root.remove());
};

/**
 * Renders all tile image in batches lazily.
 *
 * @private
 */
HomeView.prototype.renderImages = function() {
  debug('render images');
  return new Promise(resolve => {
    var total = this.tiles.length - 1;
    var batchSize = 6;
    var cursor = 0;
    var self = this;

    (function next() {
      var batch = self.tiles.slice(cursor, cursor + batchSize);
      self.renderImageBatch(batch).then(() => {
        cursor += batchSize;
        debug('rendered batch', cursor, total);
        if (cursor < total) next();
        else resolve();
      });
    })();
  });
};

/**
 * Renders a single batch of images.
 *
 * @param  {Array} tiles
 * @return {Promise}
 */
HomeView.prototype.renderImageBatch = function(tiles) {
  debug('render image batch', tiles);
  var images = tiles.map(tile => tile.root.dataset.filePath);
  var loaded = [];

  return this.getSongThumbnails(images).then(urls => {
    debug('got song thumbails', urls);
    return new Promise(resolve => {
      var remaining = urls.length;

      urls.forEach((url, i) => {
        var image = tiles[i].image;

        image.onload = () => {
          image.classList.add('loaded');
          if (!--remaining) resolve();
        };

        // #-moz-samplesize suffix tells Gecko
        // to downsample jpeg images on the fly
        image.src = url + '#-moz-samplesize=4';
      });
    });
  });
};

/**
 * Renders empty tiles placeholders
 * before our content has arrived.
 *
 * @param  {Number} count
 * @private
 */
HomeView.prototype.renderPlaceholders = function(count) {
  var frag = document.createDocumentFragment();

  for (var i = 0; i < count; i++) {
    var tile = this.createTile();
    tile.root.className = 'tile';
    frag.appendChild(tile.root);
  }

  this.els.tiles.innerHTML = '';
  this.els.tiles.appendChild(frag);
};

HomeView.prototype.getAlbums = function() {
  return this.fetch('/api/albums/list').then(response => response.json());
};

/**
 * Get a batch of song thumbnails.
 *
 * @param  {Array} filePaths
 * @return {Promise}
 */
HomeView.prototype.getSongThumbnails = function(filePaths) {
  return this.client.method('getSongThumbnails', filePaths);
};

HomeView.prototype.queueAlbum = function(filePath) {
  this.fetch('/api/queue/album/' + filePath);
};

/**
 * Create a new tile.
 *
 * @return {Object}
 */
HomeView.prototype.createTile = function() {
  var root = document.createElement('a');
  var text = document.createElement('div');
  var artist = document.createElement('div');
  var album = document.createElement('div');
  var image = document.createElement('img');

  artist.className = 'artist';
  album.className = 'album';
  text.className = 'text';
  root.className = 'tile';

  root.appendChild(image);
  text.appendChild(artist);
  text.appendChild(album);
  root.appendChild(text);

  var tile = {
    root: root,
    image: image,
    album: album,
    artist: artist
  };

  this.tiles.push(tile);
  return tile;
};

HomeView.prototype.destroy = function() {
  this.client.destroy();
  View.prototype.destroy.call(this); // super(); // Always call *last*
};

/**
 * Utils
 */

function deferred() {
  var result = {};
  result.promise = new Promise((resolve, reject) => {
    result.resolve = resolve;
    result.reject = reject;
  });
  return result;
}

window.view = new HomeView();
