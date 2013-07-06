(function() {
  /**
   * Version number for cache, allows expiring
   */
  var CACHE_VERSION = '1';
  var selfNode = document.querySelector('[data-loadsrc]');

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

  cardsNode.innerHTML = retrieve();

  window.addEventListener('load', function(evt) {
    var scriptNode = document.createElement('script'),
        loader = selfNode.dataset.loader,
        loadSrc = selfNode.dataset.loadsrc;

    if (loader) {
      scriptNode.setAttribute('data-main', loadSrc);
      scriptNode.src = loader;
    } else {
      scriptNode.src = loadSrc;
    }

    document.head.appendChild(scriptNode);
  }, false);
}());

