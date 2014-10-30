/**
 * Patch for the production: XULRunner.
 * It would take over the options before concat them to the URL,
 * and make the URL path as the special way.
 */
(function() {
  var urls = require('../urls'),
      os   = require('os');

  module.exports = {
    // The 'branch' of 'opts' should be 'latest/sdk' or 'latest/runtimes'.
    path: function(opts, channel) {
      return urls.ftpPath(
        opts.product,
        channel,
        opts.branch,
        '/'
      );
    },

    // The original filtering work dependens on path.
    // But in XULRunner, no OS or language information in the path.
    filter: function(opts, flist) {
      var language = opts.language;
      var ostype = opts.os;
      var arch = os.arch();
      if ('x64' === arch)
        arch = 'x86_64';
      if ('mac' === ostype && opts.branch.match('sdk')) {
        ostype = 'mac' + '-' + arch;  // only sdk has arch in the name.
      }
      if ('linux-x64' === ostype) {
        ostype = 'linux-x86_64';
      }
      var result = '';
      flist.forEach(function(fitem) {
        if (fitem.name.match('asc'))
          return;
        if (fitem.name.match(language + '.' + ostype)) {
          result = fitem.name;
        }
      });
      return result;
    }
  }
})();
