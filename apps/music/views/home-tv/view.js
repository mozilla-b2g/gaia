/* global View, Sanitizer */
'use strict';

var HomeView = View.extend(function HomeView() {
  View.call(this); // super();

  this.thumbnailCache = {};

  this.tiles = document.getElementById('tiles');

  this.onScroll = debounce(this.loadVisibleImages.bind(this), 500);
  window.addEventListener('scroll', () => this.onScroll());
  this.client.on('databaseChange', () => this.update());

  window.addEventListener('keydown', (evt) => {
    evt.preventDefault();

    var selectedElement = this.tiles.querySelector('.selected');
    if (!selectedElement) {
      return;
    }

    var elements = this.tiles.querySelectorAll('.tile');
    var selectedIndex = [].indexOf.call(elements, selectedElement);

    switch (evt.key) {
      case 'ArrowUp':
        selectedIndex = clamp(0, elements.length - 1, selectedIndex - 3);
        break;
      case 'ArrowDown':
        selectedIndex = clamp(0, elements.length - 1, selectedIndex + 3);
        break;
      case 'ArrowLeft':
        selectedIndex = clamp(0, elements.length - 1, selectedIndex - 1);
        break;
      case 'ArrowRight':
        selectedIndex = clamp(0, elements.length - 1, selectedIndex + 1);
        break;
      case 'Enter':
        this.queueAlbum(selectedElement.dataset.filePath);
        this.client.method('navigate', selectedElement.getAttribute('href'));
        break;
    }

    console.log('keydown == ', evt);

    selectedElement.classList.remove('selected');

    selectedElement = elements[selectedIndex];
    selectedElement.classList.add('selected');

    window.scrollTo(0, selectedElement.offsetTop);
  });

  this.update();
});

HomeView.prototype.update = function() {
  return this.getAlbums().then((albums) => {
    this.albums = albums;
    return this.render();
  });
};

HomeView.prototype.loadVisibleImages = function() {
  var scrollTop = window.scrollY;
  var scrollBottom = scrollTop + window.innerHeight;
  var promises = [];

  var tiles = this.tiles.querySelectorAll('.tile');
  var lastTileVisible = false;
  var tile, tileOffset;

  for (var i = 0, length = tiles.length; i < length; i++) {
    tile = tiles[i];
    tileOffset = tile.offsetTop;

    if (scrollTop <= tileOffset && tileOffset <= scrollBottom) {
      lastTileVisible = true;
      promises.push(this.loadTile(tile));
    }

    else if (lastTileVisible) {
      break;
    }
  }

  return Promise.all(promises);
};

HomeView.prototype.loadTile = function(tile) {
  return new Promise((resolve) => {
    if (tile.dataset.loaded) {
      return;
    }

    this.getThumbnail(tile.dataset.filePath).then((url) => {
      var img = tile.querySelector('img');
      img.src = url;
      tile.dataset.loaded = true;
      img.onload = () => {
        setTimeout(() => {
          requestAnimationFrame(() => {
            img.classList.add('loaded');
            resolve();
          });
        });
      };
    });
  });
};

HomeView.prototype.destroy = function() {
  this.client.destroy();

  View.prototype.destroy.call(this); // super(); // Always call *last*
};

HomeView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  return document.l10n.formatValues(
    'unknownArtist', 'unknownAlbum'
  ).then(([unknownArtist, unknownAlbum]) => {
    var html = [];

    this.albums.forEach((album) => {
      var template =
Sanitizer.createSafeHTML `<a class="tile" dir="auto"
    href="/player-tv"
    data-artist="${album.metadata.artist || unknownArtist}"
    data-album="${album.metadata.album || unknownAlbum}"
    data-file-path="${album.name}">
  <img>
</a>`;

      html.push(template);
    });

    this.tiles.innerHTML = Sanitizer.unwrapSafeHTML(...html);
    this.tiles.firstElementChild.classList.add('selected');
    return this.loadVisibleImages();
  });
};

HomeView.prototype.getAlbums = function() {
  return this.fetch('/api/albums/list').then(response => response.json());
};

HomeView.prototype.getThumbnail = function(filePath) {
  if (!filePath) return;

  if (this.thumbnailCache[filePath]) {
    return Promise.resolve(this.thumbnailCache[filePath]);
  }

  return this.fetch('/api/artwork/url/thumbnail/' + filePath)
    .then((response) => response.json())
    .then((url) => {
      this.thumbnailCache[filePath] = url;
      return url;
    });
};

HomeView.prototype.queueAlbum = function(filePath) {
  this.fetch('/api/queue/album/' + filePath);
};

function clamp(min, max, value) {
  return Math.min(Math.max(min, value), max);
}

function debounce(fn, ms) {
  var timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), ms);
  };
}

window.view = new HomeView();
