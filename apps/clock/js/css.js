// Loader plugin for loading CSS. Does not guarantee loading via onload
// watching, just inserts link tag.
define({
  load: function(id, require, onload, config) {
    if (config.isBuild) {
        return onload();
    }

    var style = document.createElement('link');
    style.type = 'text/css';
    style.rel = 'stylesheet';
    style.href = require.toUrl(id + '.css');
    style.addEventListener('load', onload, false);
    document.head.appendChild(style);
  }
});
