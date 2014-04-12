/* global
  Shims
 */

'use strict';

var APPLICATION_URL = '../index.html';

var container = document.getElementById('container');
var startButton = document.getElementById('start');
var iframe = document.getElementById('application');

function init() {
  Shims.render(document.getElementById('shim-contributions'));

  iframe.addEventListener('load', onIframeLoad);
  startButton.addEventListener('click', loadApplication);
}

function loadApplication() {
  iframe.src = APPLICATION_URL;
  // reinserting the element makes our load event happen before the iframe's
  // internal load event
  container.insertBefore(iframe, container.firstElementChild);

  // strangely, without this we don't get the other load event early enough
  iframe.contentWindow.addEventListener('load', function() {
    console.log('window loaded !');
  });
  iframe.contentWindow.addEventListener('DOMContentLoaded', function(e) {
    console.log('window dom content loaded !');
    var fwindow = iframe.contentWindow;
    fwindow.addEventListener('unload', onIframeUnload);

    injectMocks(fwindow);
  });

  startButton.textContent = 'Reload the application';
}

function onIframeLoad(e) {
  console.log('iframe loaded !');
}

function injectMocks(fwindow) {
  Shims.injectTo(fwindow);
}

function onIframeUnload(e) {
  resetHandlers(e.target);
}

function resetHandlers(fwindow) {
  console.log('resetting handlers');
  Shims.teardown(fwindow);
}

init();
