var PERMISSIONS_TYPE = {
  'certified': 3,
  'privileged': 2,
  'web': 1
};

module.exports.manifest = 'manifest.webapp';
/**
 * Object responsible for manipulating the contents of the  webapps.json file.
 *
 *    // content from the webapps.json file
 *    var apps = new Webapps({  });
 *
 * @param {Object} content for webapps.
 */
function Webapps(content) {
  this.content = content || {};
}

Webapps.prototype = {
  /**
   * Determines the next local id based on content.
   *
   * @return {Number} next id.
   */
  nextLocalId: function() {
    var highest = 0;
    Object.keys(this.content).forEach(function(key) {
      var app = this.content[key];
      if (app.localId > highest) {
        highest = app.localId;
      }
    }, this);

    return highest + 1;
  },

  /**
   * Returns the app status for a given type.
   * See PERMISSIONS_TYPE.
   *
   * @param {String} type see manifest.type.
   * @return {Number} appStatus.
   */
  appStatusForType: function(type) {
    // default is web
    return PERMISSIONS_TYPE[type] || 1;
  },

  /**
   * Adds an app by its origin and manifest to the preloaded apps.
   *
   * @param {String} domain of app.
   * @param {Object} manifest for app.
   * @param {Object} [options] optional.
   */
  add: function(domain, manifest, options) {
    if (typeof options === 'function') {
      callback = options;
      options = null;
    }

    var localId = this.nextLocalId();
    var origin = 'app://' + domain;

    // check if this is an update to an existing record
    if (this.content[domain]) {
      // if so use the same app id
      localId = this.content[domain].localId;
    }

    var record = {
      origin: origin,
      installOrigin: origin,
      installTime: Date.now(),
      appStatus: this.appStatusForType(manifest.type),
      localId: localId,
      manifestURL: origin + '/' + module.exports.manifest
    };

    return this.content[domain] = record;
  },

  /**
   * Special toJSON helper that only returns this.content.
   */
  toJSON: function() {
    return this.content;
  }
};

module.exports.Webapps = Webapps;
