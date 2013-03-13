
var fbLoader = (function() {

  var loaded = false;
  scriptsLoaded = 0;

  var loadFb = function loadFb() {
    if (loaded)
      return;

    loaded = true;
    var iframesFragment = document.createDocumentFragment();

    var curtain = document.createElement('iframe');
    curtain.id = 'fb-curtain';
    curtain.src = '/facebook/curtain.html';
    iframesFragment.appendChild(curtain);

    var oauth = document.createElement('iframe');
    oauth.id = 'fb-oauth';
    iframesFragment.appendChild(oauth);

    var extensions = document.createElement('iframe');
    extensions.id = 'fb-extensions';
    iframesFragment.appendChild(extensions);

    document.body.appendChild(iframesFragment);

    var scripts = [
      '/contacts/js/fb_extensions.js',
      '/contacts/oauth2/js/parameters.js',
      '/contacts/js/fb/fb_utils.js',
      '/contacts/js/fb/fb_query.js',
      '/contacts/js/fb/fb_contact_utils.js',
      '/contacts/js/fb/fb_contact.js',
      '/contacts/js/fb/fb_link.js',
      '/contacts/js/fb/fb_messaging.js',
      '/contacts/js/value_selector.js',
      '/contacts/js/fb/fb_data.js'
    ];

    var fragment = document.createDocumentFragment();

    var onScriptLoaded = function onScriptLoaded() {
      scriptsLoaded++;
      if (scriptsLoaded === scripts.length) {
        var event = new CustomEvent('facebookLoaded');
        window.dispatchEvent(event);
      }
    };

    for (var i = 0; i < scripts.length; i++) {
      var script = scripts[i];
      var elem = document.createElement('script');
      elem.setAttribute('type', 'text/javascript');
      elem.src = script;
      elem.addEventListener('load', onScriptLoaded);
      fragment.appendChild(elem);
    }

    document.head.appendChild(fragment);
  };

  return {
    load: loadFb,
    get loaded() { return loaded; }
  };

})();
