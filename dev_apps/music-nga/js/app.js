/* global SERVICE_WORKERS, bridge */
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

var $id = document.getElementById.bind(document);

var views = {};
var isPlaying = false;
var activity = null;

if (navigator.mozSetMessageHandler) {
  navigator.mozSetMessageHandler('activity', activity => onActivity(activity));
}

var service = bridge.service('*')
  .on('message', message => message.forward($id('endpoint')))
  .listen();

var client = bridge.client({
  service: 'music-service',
  endpoint: $id('endpoint'),
  timeout: false
});

client.connect();

client.connected.then(() => {
  client.on('play', () => isPlaying = true);
});

var header             = $id('header');
var headerTitle        = $id('header-title');
var playerButton       = $id('player-button');
var activityDoneButton = $id('activity-done-button');
var viewStack          = $id('view-stack');
var tabBar             = $id('tab-bar');

header.addEventListener('action', (evt) => {
  if (evt.detail.type === 'back') {
    if (viewStack.states.length > 1) {
      viewStack.popView();
      window.history.back();
      return;
    }

    switch (activity && activity.source.name) {
      case 'open':
        activity.postResult({ saved: false });
        break;
      case 'pick':
        activity.postError('pick cancelled');
        break;
    }
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
  var view = evt.detail.view;
  var viewId = view && view.dataset.viewId;

  document.body.dataset.activeViewId = viewId;

  playerButton.hidden = viewId === 'player' || !isPlaying;
  activityDoneButton.hidden = viewId !== 'player' || !activity;
  setBackButtonHidden(!activity && viewStack.states.length < 2);
});

viewStack.addEventListener('pop', (evt) => {
  setHeaderTitle(evt.detail.params.title);
});

tabBar.addEventListener('change', (evt) => {
  var tab = evt.detail.selectedElement;
  var viewId = tab.dataset.viewId;
  var url = viewId ? '/' + viewId : '/';

  navigateToURL(url, true);
});

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
  if (viewStack.activeState) {
    viewStack.activeState.params.title = title;
  }

  window.requestAnimationFrame(() => headerTitle.textContent = title);
}

function setBackButtonHidden(hidden) {
  header.els.actionButton.style.visibility = hidden ? 'hidden' : 'visible';
}

function getViewById(viewId) {
  var view = views[viewId];
  if (view) {
    return view;
  }

  view = views[viewId] = document.createElement('iframe');
  view.dataset.viewId = viewId;
  view.src = 'views/' + viewId + '/index.html';

  return view;
}

function navigateToURL(url, replaceRoot) {
  var path = url.substring(1);
  var parts = path.split('?');

  var viewId = parts.shift();
  var params = parseQueryString(parts.join('?'));
  var view = getViewById(viewId);

  var tab = tabBar.querySelector('button[data-view-id="' + viewId + '"]');
  if (tab) {
    tabBar.selectedElement = tab;
  }

  if (!perfMark.visuallyLoaded) {
    view.addEventListener('rendered', onVisuallyLoaded);
  }

  if (replaceRoot) {
    viewStack.setRootView(view, params);
  }

  else {
    viewStack.pushView(view, params);
  }

  if (!SERVICE_WORKERS) {
    url = '#' + url;
  }

  window.history.pushState(null, null, url);
}

function parseQueryString(queryString) {
  var query = {};

  var params = queryString.split('&');
  params.forEach((param) => {
    var parts = param.split('=');
    var key = parts.shift();
    var value = parts.join('=');

    query[key] = value || true;
  });

  return query;
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
    url = '/' + tabBar.firstElementChild.dataset.viewId;
  }

  header.action = 'back';
  navigateToURL(url, true);

  // PERFORMANCE MARKER (2): navigationInteractive
  // Designates that the app's *core* chrome or navigation interface
  // has its events bound and is ready for user interaction.
  perfMark('navigationInteractive');
}
