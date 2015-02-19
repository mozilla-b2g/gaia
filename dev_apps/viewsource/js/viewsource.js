(function() {
  'use strict';

  // We don't want the system app to be affected
  if (window.location.hostname === 'system.gaiamobile.org') {
    return;
  }

  // Otherwise, start listening to touch events with a capturing listener
  window.addEventListener('touchstart', tap, true);

  const TIME_THRESHOLD = 400;  // max ms between taps
  const SPACE_THRESHOLD = 20;  // max pixel distance between taps

  var sourceViewer; // the element that displays the source

  var count = 0;
  var lastx, lasty;
  var timer = null;

  function tap(event) {
    clearTimeout(timer);
    count++;
    if (count === 5) {
      event.preventDefault();  // We'll eat this last event
      event.stopPropagation();
      count = 0;
      go();
    }
    else {
      // Get coordinates of this tap
      var x = event.changedTouches[0].clientX;
      var y = event.changedTouches[0].clientY;

      // If this is not the first tap in a sequence verify that this tap
      // is near the last one. If the tap is too far away, reset the tap 
      // count back to 0.
      if (count > 1) {
        if (Math.abs(x - lastx) > SPACE_THRESHOLD ||
            Math.abs(y - lasty) > SPACE_THRESHOLD) {
          count = 0;
          return;
        }
      }
      lastx = x;
      lasty = y;

      // taps must be within 1/3rd of a second of each other or
      // we reset back down to 0.
      timer = setTimeout(function() { count = 0; }, TIME_THRESHOLD);
    }
  }

  function go() {
    if (sourceViewer) {
      // If source is already displayed, hide it.
      hidesource();
    }
    else {
      // Otherwise, load and display source.
      loadsource();
    }
  }

  function loadsource() {
    var url = window.location.href;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.responseType = 'text';
    xhr.send();
    xhr.onload = function() {
      if (xhr.status === 200) {
        viewsource(url, xhr.response);
      }
    };
  }

  function escape(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function viewsource(url, source) {
    url = escape(url);
    source = escape(source);

    var html =
`
<style scoped>
* { box-sizing: border-box; }
:scope {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #000;
  color: #fff;
  z-index: 1000000;
}
header {
  width: 100%;
  height: 24px;
  line-height: 19px;
  font-size: 17px;
  text-align: center;
  font-weight: bold;
  font-family: sans-serif;
  padding: 3px;
  background-color: gray;
  color: white;
}
pre {
  width: 100%;
  height: calc(100% - 24px);
  overflow: scroll;
  font-size: 14px;
}
</style>
<header>${url}</header>
<pre>
${source}
</pre>
`;

    sourceViewer = document.createElement('div');
    sourceViewer.innerHTML = html;
    document.body.appendChild(sourceViewer);
  }

  function hidesource() {
    if (sourceViewer) {
      document.body.removeChild(sourceViewer);
      sourceViewer = null;
    }
  }

  // If the app is hidden, hide the source, too
  window.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      hidesource();
    }
  });

}());
