/**
 * Weinre script to inject in system's index.html
 * This script:
 * - reads configuration file with config
 * - if weinre is active, load the script on the system
 * - hook into frame creation and append info to the src of every app frame
 */
(function() {
  /**
   * Read the resources/settings.json file.
   * @param {Function} callback Has arg0 null if the request failed,
   *                            or the config object otherwise.
   */
  function getConfigFile(callback) {
    // read settings file and if weinre is enabled then go with the flow
    var req = new XMLHttpRequest();
    req.open('GET', 'resources/settings.json', true);
    req.onreadystatechange = function() {
      if (req.readyState === 4 && req.status === 200) {
        try {
          var config = JSON.parse(req.responseText);
          callback(config);
        }
        catch (ex) {
          callback(null);
        }
      }
      else if (req.readyState === 4) {
        callback(null);
      }
    };
    req.send(null);
  }

  function inject() {
    getConfigFile(function(config) {
      if (!config || !config.weinre || !config.weinre.enabled)
        return;

      // load the weinre script
      (function(e, host) {
        var src = 'http://' + host + '/target/target-script-min.js#anonymous';
        e.setAttribute('src', src);
        document.getElementsByTagName('body')[0].appendChild(e);
      })(document.createElement('script'), config.weinre.host);

      // append the weinre host to all app frames (to be read by weinre_app.js)
      window.addEventListener('createappframe', function(ev) {
        if (ev.detail.frame)
          var hash = '#weinre=' + encodeURIComponent(config.weinre.host);
          ev.detail.frame.src += hash;
      });
    });
  }

  // so here is quite a timing issue,
  // don't know where it comes from but f.e. the wifiManager
  // doesn't like it without the timeout... Anyone has solution?
  setTimeout(function() {
    if (document.readyState === 'complete')
      inject();
    else
      document.addEventListener('DOMContentLoaded', inject);
  }, 2000);
})();
