/* global App, Settings, KeyNavigationAdapter */
'use strict';

window.addEventListener('load', function onLoad() {
  window.removeEventListener('load', onLoad);

  var app = new App('main-section');

  var keyNav = new KeyNavigationAdapter();
  keyNav.init();
  keyNav.on('move', app.handleMove.bind(app));
  keyNav.on('enter', app.handleClick.bind(app));
  keyNav.on('esc', app.handleBack.bind(app));

  Settings.start();
  Settings.once('ready', app.show.bind(app));
});
