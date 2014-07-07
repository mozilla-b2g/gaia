/*jshint browser: true */
/*global performance, console */
var _xstart = performance.timing.fetchStart -
              performance.timing.navigationStart;
function plog(msg) {
  console.log(msg + ' ' + (performance.now() - _xstart));
}

/**
 * Apparently the event catching done for the startup events from
 * performance_testing_helper record the last event received of that type as
 * the official time, instead of using the first. So unfortunately, we need a
 * global to make sure we do not emit the same events later.
 * @type {Boolean}
 */
var startupCacheEventsSent = false;

/**
 * Version number for cache, allows expiring cache.
 * Set by build process. Set as a global because it
 * is also used in html_cache.js.
 */
var HTML_COOKIE_CACHE_VERSION = '1';

// Use a global to work around issue with
// navigator.mozHasPendingMessage only returning
// true to the first call made to it.
window.htmlCacheRestorePendingMessage = [];

(function() {
  var selfNode = document.querySelector('[data-loadsrc]'),
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

    if (version !== HTML_COOKIE_CACHE_VERSION) {
      console.log('Skipping cookie cache, out of date. Expected ' +
                  HTML_COOKIE_CACHE_VERSION + ' but found ' + version);
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
    var contents = retrieve();
    cardsNode.innerHTML = contents;
    startupCacheEventsSent = !!contents;
    window.addEventListener('load', startApp, false);
  }

  // START COPY performance_testing_helper.js
  // A copy instead of a separate script because the gaia build system is not
  // set up to inline this with our main script element, and we want this work
  // to be done after the cache restore, but want to trigger the events that
  // may be met by the cache right away without waiting for another script
  // load after html_cache_restore.
  function dispatch(name) {
    if (!window.mozPerfHasListener) {
      return;
    }

    var now = window.performance.now();

    setTimeout(function() {
      var detail = {
        name: name,
        timestamp: now
      };
      var event = new CustomEvent('x-moz-perf', { detail: detail });

      window.dispatchEvent(event);
    });
  }

  ([
    'moz-chrome-dom-loaded',
    'moz-chrome-interactive',
    'moz-app-visually-complete',
    'moz-content-interactive',
    'moz-app-loaded'
  ].forEach(function(eventName) {
      window.addEventListener(eventName, function mozPerfLoadHandler() {
        dispatch(eventName);
      }, false);
    }));

  window.PerformanceTestingHelper = {
    dispatch: dispatch
  };
  // END COPY performance_testing_helper.js

  if (startupCacheEventsSent) {
    window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));
    window.dispatchEvent(new CustomEvent('moz-app-visually-complete'));
  }
}());

