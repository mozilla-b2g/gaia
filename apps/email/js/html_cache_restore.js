/*jshint browser: true */
/*global performance, console */
var _xstart = performance.timing.fetchStart -
              performance.timing.navigationStart;
function plog(msg) {
  console.log(msg + ' ' + (performance.now() - _xstart));
}


// Use a global to work around issue with
// navigator.mozHasPendingMessage only returning
// true to the first call made to it.
window.htmlCacheRestorePendingMessage = [];

(function() {
  /**
   * Version number for cache, allows expiring cache.
   * Set by build process, value must match the value
   * in html_cache.js.
   */
  var CACHE_VERSION = '1',
      selfNode = document.querySelector('[data-loadsrc]'),
      loader = selfNode.dataset.loader,
      loadSrc = selfNode.dataset.loadsrc;

  /**
   * Gets the HTML string from cache.
   * This method assumes all cookie keys that have pattern
   * /htmlc(\d+)/ are part of the object value. This method could
   * throw given vagaries of cookie cookie storage and encodings.
   * Be prepared.
   */
  function retrieve() {
    var value = document.cookie;
    var pairRegExp = /htmlc(\d+)=([^;]+)/g;
    var segments = [];
    var match, index, version;

    while ((match = pairRegExp.exec(value))) {
      segments[parseInt(match[1], 10)] = match[2] || '';
    }

    value = decodeURIComponent(segments.join(''));

    index = value.indexOf(':');

    if (index === -1) {
      value = '';
    } else {
      version = value.substring(0, index);
      value = value.substring(index + 1);
    }

    if (version !== CACHE_VERSION) {
      value = '';
    }

    return value;
  }

  /*
   * Automatically restore the HTML as soon as module is executed.
   * ASSUMES card node is available (DOMContentLoaded or execution of
   * module after DOM node is in doc)
   */
  var cardsNode = document.getElementById(selfNode.dataset.targetid);

  function startApp() {
    var scriptNode = document.createElement('script');

    if (loader) {
      scriptNode.setAttribute('data-main', loadSrc);
      scriptNode.src = loader;
    } else {
      scriptNode.src = loadSrc;
    }

    document.head.appendChild(scriptNode);
  }

  // TODO: mozHasPendingMessage can only be called once?
  // Need to set up variable to delay normal code logic later
  if (navigator.mozHasPendingMessage) {
    if (navigator.mozHasPendingMessage('activity'))
      window.htmlCacheRestorePendingMessage.push('activity');
    if (navigator.mozHasPendingMessage('alarm'))
      window.htmlCacheRestorePendingMessage.push('alarm');
    if (navigator.mozHasPendingMessage('notification'))
      window.htmlCacheRestorePendingMessage.push('notification');
  }

  if (window.htmlCacheRestorePendingMessage.length) {
    startApp();
  } else {
    cardsNode.innerHTML = retrieve();
    window.addEventListener('load', startApp, false);
  }
}());

