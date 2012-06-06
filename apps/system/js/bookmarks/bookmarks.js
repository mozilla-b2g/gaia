/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * The first time Gaia is launched a set of bookmarks are appended to the
 * list of already installed applications.
 *
 * The normal startup operation is hooked by this code before beeing
 * redispatched transparently.
 */
(function bookmarksHook() {
  if (localStorage['bookmarks'])
    return;
  localStorage['bookmarks'] = true;

  var previousInstallHandler = navigator.mozApps.mgmt.oninstall;

  function installNextBookmark() {
    var bookmark = bookmarksList.pop();
    if (!bookmark) {
      navigator.mozApps.mgmt.oninstall = previousInstallHandler;
      setTimeout(main);
      return;
    }

    // XXX The location of the bookmarks icon are a hack since they
    // live into an other application.
    var url = document.location.toString().replace('system', 'homescreen');
    var manifest = '{' +
                   '  "name": "' + bookmark.name + '",' +
                   '  "description": "' + bookmark.name + '",' +
                   '  "launch_path": "' + bookmark.url + '",' +
                   '  "icons": {' +
                   '    "120": "' + url + bookmark.icon + '"' +
                   '  }' +
                   '}';
    navigator.mozApps.install('data:text/plain,' + manifest);
  }


  const bookmarksFile = 'js/bookmarks/bookmarks.json';
  const bookmarksList = [];

  // Prevent the 'load' event to fire the regular load handler.
  var main = document.body.onload;
  document.body.onload = '';

  // Retrieve the list of bookmarks to add
  var xhr = new XMLHttpRequest();
  xhr.open('GET', bookmarksFile, true);
  xhr.responseType = 'json';
  xhr.send(null);

  // If an error happened continue the normal exexution.
  xhr.onerror = function bookmarks_error() {
    setTimeout(main);
  };

  // Make sure the homescreen has started, even if bug 748896 has not landed.
  var timeout = 0;
  var kFallbackTimeout = 5000;

  // Once the list of bookmarks if available starts to install them
  // as application one by one.
  xhr.onload = function bookmarks_load(evt) {
    var response = xhr.response;
    for (var name in response) {
      var bookmark = response[name];
      bookmark.name = name;
      bookmarksList.push(bookmark);
    }

    // In case bug 748896 has not landed, add a timeout
    timeout = setTimeout(main, kFallbackTimeout);

    installNextBookmark();
  };

  // Every time a bookmark has finised to installed, add the next.
  navigator.mozApps.mgmt.oninstall = function bookmark_installed(evt) {
    clearTimeout(timeout);
    setTimeout(installNextBookmark);
  };
})();

