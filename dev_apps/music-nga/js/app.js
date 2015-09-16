/* global SERVICE_WORKERS, service */
'use strict';

function perfMark(marker) {
  window.performance.mark(marker);
  perfMark[marker] = Date.now();
}

perfMark.get = (marker) => {
  var start = window.performance.timing.fetchStart; // domLoading?
  return perfMark[marker] - start;
};

perfMark.log = () => Object.keys(perfMark).forEach((marker) => {
  if (typeof perfMark[marker] !== 'function') {
    console.log('[Performance] ' + marker + ': ' + perfMark.get(marker) + 'ms');
  }
});

// PERFORMANCE MARKER (1): navigationLoaded
// Designates that the app's *core* chrome or navigation interface
// exists in the DOM and is marked as ready to be displayed.
perfMark('navigationLoaded');

const VIEWS = {
  ALBUM_DETAIL:    { TAB: 'albums',    URL: '/views/album-detail/index.html' },
  ALBUMS:          { TAB: 'albums',    URL: '/views/albums/index.html' },
  ARTIST_DETAIL:   { TAB: 'artists',   URL: '/views/artist-detail/index.html' },
  ARTISTS:         { TAB: 'artists',   URL: '/views/artists/index.html' },
  HOME:            { TAB: 'home',      URL: '/views/home/index.html' },
  PLAYER:          { TAB: 'home',      URL: '/views/player/index.html' },
  PLAYLIST_DETAIL: { TAB: 'playlists', URL: '/views/playlist-detail/index.html' },
  PLAYLISTS:       { TAB: 'playlists', URL: '/views/playlists/index.html' },
  SONGS:           { TAB: 'songs',     URL: '/views/songs/index.html' },
};

var $id = document.getElementById.bind(document);

var isPlaying = false;
var activity = null;

if (navigator.mozSetMessageHandler) {
  navigator.mozSetMessageHandler('activity', activity => onActivity(activity));
}

var client = bridge.client({
  service: 'music-service',
  endpoint: window,
  timeout: false
});

client.on('play', () => isPlaying = true);

client.on('databaseChange', () => updateOverlays());

client.on('databaseUpgrade', () => upgradeOverlay.hidden = false);

client.on('databaseUnavailable', (reason) => {
  noCardOverlay.hidden    = reason !== 'nocard';
  pluggedInOverlay.hidden = reason !== 'pluggedin';
});

client.on('databaseEnumerable', () => upgradeOverlay.hidden = true);

client.on('databaseReady', () => {
  noCardOverlay.hidden    = true;
  pluggedInOverlay.hidden = true;
});

client.connect();

updateOverlays();

var header             = $id('header');
var headerTitle        = $id('header-title');
var playerButton       = $id('player-button');
var activityDoneButton = $id('activity-done-button');
var viewStack          = $id('view-stack');
var tabBar             = $id('tab-bar');
var emptyOverlay       = $id('empty-overlay');
var noCardOverlay      = $id('no-card-overlay');
var pluggedInOverlay   = $id('plugged-in-overlay');
var upgradeOverlay     = $id('upgrade-overlay');

header.addEventListener('action', (evt) => {
  if (evt.detail.type === 'back') {
    if (viewStack.views.length > 1) {
      // Don't destroy the popped view if it is the "Player" view.
      viewStack.popView(!viewStack.activeView.frame.src.endsWith(VIEWS.PLAYER.URL));
      window.history.back();
      return;
    }

    cancelActivity();
  }
});

playerButton.addEventListener('click', () => navigateToURL('/player'));

activityDoneButton.addEventListener('click', () => {
  switch (activity && activity.source.name) {
    case 'open':
      // TODO: Implement 'Save' functionality
      activity.postResult({ saved: false });
      break;
    case 'pick':
      client.method('getPlaybackStatus').then((status) => {
        var getSong = client.method('getSong', status.filePath);
        var getSongFile = client.method('getSongFile', status.filePath);
        var getSongThumbnail = client.method('getSongThumbnail', status.filePath);

        Promise.all([getSong, getSongFile, getSongThumbnail])
          .then(([song, file, thumbnail]) => {
            activity.postResult({
              type: file.type,
              blob: file,
              name: song.metadata.title || '',
              // We only pass some metadata attributes so we don't share
              // personal details like # of times played and ratings.
              metadata: {
                title: song.metadata.title,
                artist: song.metadata.artist,
                album: song.metadata.album,
                picture: thumbnail
              }
            });
          });
      });
      break;
  }
});

viewStack.addEventListener('change', (evt) => {
  var viewUrl = evt.detail.url;

  var tab = getTabByViewURL(viewUrl);
  if (tab) {
    tabBar.selectedElement = tab;
  }

  document.body.dataset.activeViewUrl = viewUrl;

  playerButton.hidden = viewUrl === VIEWS.PLAYER.URL || !isPlaying;
  activityDoneButton.hidden = viewUrl !== VIEWS.PLAYER.URL || !activity;
  setBackButtonHidden(!activity && viewStack.views.length < 2);
  setHeaderTitle(evt.detail.title);
});

viewStack.addEventListener('titlechange', (evt) => {
  setHeaderTitle(evt.detail);
});

viewStack.addEventListener('rendered', onVisuallyLoaded);

tabBar.addEventListener('change', (evt) => {
  var tab = evt.detail.selectedElement;

  navigateToURL(tab.dataset.url, true);
});

emptyOverlay.addEventListener('cancel', () => cancelActivity());
noCardOverlay.addEventListener('cancel', () => cancelActivity());
pluggedInOverlay.addEventListener('cancel', () => cancelActivity());
upgradeOverlay.addEventListener('cancel', () => cancelActivity());

if (SERVICE_WORKERS) {
  navigator.serviceWorker.getRegistration().then((registration) => {
    if (registration && registration.active) {
      console.log('ServiceWorker already registered');
      boot();
      return;
    }

    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(() => {
        console.log('ServiceWorker registered successfully');
        window.location.reload();
      })
      .catch((error) => {
        console.error('ServiceWorker registration failed', error);
      });
  });
}

else {
  boot();
}

function setHeaderTitle(title) {
  if (viewStack.activeView) {
    viewStack.activeView.title = title;
  }

  window.requestAnimationFrame(() => headerTitle.textContent = title);
}

function setBackButtonHidden(hidden) {
  header.els.actionButton.style.visibility = hidden ? 'hidden' : 'visible';
}

function getTabByViewURL(url) {
  for (var key in VIEWS) {
    if (url === VIEWS[key].URL) {
      return tabBar.querySelector('button[value="' + VIEWS[key].TAB + '"]');
    }
  }

  return null;
}

function navigateToURL(url, replaceRoot) {
  var path = url.substring(1);
  var parts = path.split('?');

  var viewUrl = '/views/' + parts.shift() + '/index.html';

  if (replaceRoot) {
    viewStack.setRootView(viewUrl);
  }

  else {
    viewStack.pushView(viewUrl);
  }

  if (!SERVICE_WORKERS) {
    url = '#' + url;
  }

  window.history.pushState(null, null, url);
}

function updateOverlays() {
  client.method('getSongCount').then((count) => {
    emptyOverlay.hidden = count > 0;
  });

  client.method('getDatabaseStatus').then((status) => {
    noCardOverlay.hidden    = status.unavailable !== 'nocard';
    pluggedInOverlay.hidden = status.unavailable !== 'pluggedin';

    upgradeOverlay.hidden = !status.upgrading;
  });
}

function cancelActivity() {
  switch (activity && activity.source.name) {
    case 'open':
      activity.postResult({ saved: false });
      break;
    case 'pick':
      activity.postError('pick cancelled');
      break;
  }
}

function onActivity(activity) {
  window.activity = activity;

  if (activity.source.name === 'open') {
    client.method('open', activity.source.data.blob);
  }

  setBackButtonHidden(false);
}

function onSearchOpen() {
  document.body.dataset.search = true;
}

function onSearchClose() {
  document.body.removeAttribute('data-search');
}

function onVisuallyLoaded() {
  this.removeEventListener('rendered', onVisuallyLoaded);

  // PERFORMANCE MARKER (3): visuallyLoaded
  // Designates that the app is visually loaded (e.g.: all of the
  // "above-the-fold" content exists in the DOM and is marked as
  // ready to be displayed).
  perfMark('visuallyLoaded');

  // PERFORMANCE MARKER (4): contentInteractive
  // Designates that the app has its events bound for the minimum
  // set of functionality to allow the user to interact with the
  // "above-the-fold" content.
  perfMark('contentInteractive');

  // PERFORMANCE MARKER (5): fullyLoaded
  // Designates that the app is *completely* loaded and all relevant
  // "below-the-fold" content exists in the DOM, is marked visible,
  // has its events bound and is ready for user interaction. All
  // required startup background processing should be complete.
  perfMark('fullyLoaded');
  perfMark.log();
}

function boot() {
  var url = SERVICE_WORKERS ?
    window.location.href.substring(window.location.origin.length) :
    window.location.hash.substring(1) || '/'

  if (url === '/' || url === '/index.html') {
    url = tabBar.firstElementChild.dataset.url;
  }

  header.action = 'back';
  setBackButtonHidden(true);
  navigateToURL(url, true);

  // PERFORMANCE MARKER (2): navigationInteractive
  // Designates that the app's *core* chrome or navigation interface
  // has its events bound and is ready for user interaction.
  perfMark('navigationInteractive');
}
