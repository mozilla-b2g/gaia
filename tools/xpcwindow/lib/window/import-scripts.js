window.importScripts = importScripts;

function importScripts() {
  var root = _IMPORT_ROOT,
      files = Array.prototype.slice.call(arguments);

  files.forEach(function(path) {
    if (typeof(path) !== 'string') {
      return;
    }

    if (!(path.substr(0, 1) === '/')) {
      path = root + '/' + path;
    }

    try {
      mozIJSSubScriptLoader.loadSubScript('file://' + path, window);
    } catch (e) {
      throw new Error(
        'importScript failed while trying to load: "' + path + '"\n\n' + e.toString()
      );
    }

  });
}
