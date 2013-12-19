
return (function () {
  Cu.import('resource://gre/modules/Webapps.jsm');
  let app = DOMApplicationRegistry.getAppByManifestURL(manifestUrl);
  return app ? app.name : null;
})();
