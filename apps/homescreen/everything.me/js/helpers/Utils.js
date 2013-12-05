'use strict';

Evme.Utils = new function Evme_Utils() {
  var self = this,
      userAgent = '', connection = null, cssPrefix = '', iconsFormat = null,
      newUser = false, isTouch = false,
      parsedQuery = parseQuery(),
      elContainer = null,
      elOverlay = null,
      headEl = document.querySelector('html>head'),
      filterSelectorTemplate = '.evme-apps ul:not({0}) li[{1}="{2}"]',

      // used to generate a uuid (using createObjectURL)
      uuidBlob = new Blob(),

      CONTAINER_ID = 'evmeContainer', // main E.me container
      OVERLAY_ID = 'evmeOverlay',     // E.me element visible on all grid pages
      SCOPE_CLASS = 'evmeScope',      // elements with E.me content

      COOKIE_NAME_CREDENTIALS = 'credentials',

      CLASS_WHEN_KEYBOARD_IS_VISIBLE = 'evme-keyboard-visible',

      OS_ICON_SIZE = 0,

      OSMessages = this.OSMessages = {
        'OPEN_URL': 'open-url',
        'SHOW_MENU': 'show-menu',
        'HIDE_MENU': 'hide-menu',
        'MENU_HEIGHT': 'menu-height',
        'EVME_OPEN': 'evme-open',
        'GET_ICON_SIZE': 'get-icon-size',
        'SET_WALLPAPER': 'set-wallpaper'
      },

      host = document.location.host,
      domain = host.replace(/(^[\w\d]+\.)?([\w\d]+\.[a-z]+)/, '$2'),
      protocol = document.location.protocol,
      homescreenOrigin = protocol + '//homescreen.' + domain;

  // reduce this from our icons that should be the same as the OS
  // since OS icons have some transparent padding to them
  this.OS_ICON_PADDING = 2;

  this.PIXEL_RATIO_NAMES = {
    NORMAL: 'normal',
    HIGH: 'high'
  };

  this.ICONS_FORMATS = {
    'Small': 10,
    'Large': 20
  };

  this.REGEXP = {
     URL: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/
  };

  this.isKeyboardVisible = false;

  this.EMPTY_IMAGE = '../../images/empty.gif';

  this.EMPTY_APPS_SIGNATURE = '';

  this.APPS_FONT_SIZE = 13 * (window.devicePixelRatio || 1);
  this.APP_NAMES_SHADOW_OFFSET_X = 0;
  this.APP_NAMES_SHADOW_OFFSET_Y = 1;
  this.APP_NAMES_SHADOW_BLUR = 4;
  this.APP_NAMES_SHADOW_COLOR = 'rgba(0, 0, 0, 0.9)';

  this.PIXEL_RATIO_NAME =
    (window.devicePixelRatio > 1) ?
    this.PIXEL_RATIO_NAMES.HIGH : this.PIXEL_RATIO_NAMES.NORMAL;

  this.NOOP = function() {};

  this.currentResultsManager = null;

  this.init = function init() {
    userAgent = navigator.userAgent;
    cssPrefix = getCSSPrefix();
    connection = Connection.get();
    isTouch = window.hasOwnProperty('ontouchstart');

    elContainer = document.getElementById(CONTAINER_ID);
    elOverlay = document.getElementById(OVERLAY_ID);
    OS_ICON_SIZE = self.sendToOS(self.OSMessages.GET_ICON_SIZE);
    OS_ICON_SIZE *= window.devicePixelRatio;
  };

  this.logger = function logger(level) {
    return function Evme_logger() {
      var t = new Date(),
          h = t.getHours(),
          m = t.getMinutes(),
          s = t.getSeconds(),
          ms = t.getMilliseconds();

      h < 10 && (h = '0' + h);
      m < 10 && (m = '0' + m);
      s < 10 && (s = '0' + s);
      ms < 10 && (ms = '00' + ms) ||
        ms < 100 && (ms = '0' + ms);

      console[level]('[%s EVME]: %s', [h, m, s, ms].join(':'),
                                        Array.prototype.slice.call(arguments));
    };
  };

  this.log = this.logger('log');
  this.warn = this.logger('warn');
  this.error = this.logger('error');

  /**
   * Creates a <style> element which basically does result deduping
   * by applying a css rule {display:none} to certain results
   * This is to avoid complex JS deduping
   *
   * What is deduped:
   * 1. in Search and Collections (using appUrls):
   *    Cloud app if the equivalent native app is installed
   * 2. in Collections (using cloudEquivs):
   *    Cloud app if it was pinned to Collection
   * 3. in Collections (using appUrls):
   *    Bookmarked cloud app if it was added to Collection
   * 4. in Search (using slugs):
   *    MarketApp (download suggestions) if it installed
   *
   * example
   * Cloud results should be hidden if already bookmarked
   * Installed results call filterProviderResults with the following cfg:
   * {
   *  id: 'installed',
   *  containerSelector: '.installed',
   *  attribute: 'data-url',
   *  items: [url1, url2]
   * }
   * filterProviderResults creates the following element in <head>
   * <style>
   * ul:not(.installed) li[data-url="url1"],
   * ul:not(.installed) li[data-url="url2"] {
   *  display: none
   * }
   * </style>
   *
   */
  this.filterProviderResults = function filterProviderResults(cfg) {
    var id = cfg.id,
        items = cfg.items,
        styleEl = document.querySelector('style[id="' + id + '"]'),
        html = '';

    if (!styleEl) {
      styleEl = Evme.$create('style', { 'id': id });
      headEl.appendChild(styleEl);
    }

    // if no items were supplied - simply removed current content
    if (items && items.length) {
      var selectors = [],
          value = cfg.value,
          attribute = cfg.attribute,
          containerSelector = cfg.containerSelector,
          renderTemplate = self.renderTemplate;

      for (var i = 0, item; item = items[i++];) {
        if (value) {
          item = renderTemplate(value, item);
        }
        selectors.push(
          renderTemplate(filterSelectorTemplate,
                          containerSelector, attribute, item)
        );
      }
      html = selectors.join(',') + '{display:none}';
    }
    styleEl.innerHTML = html;
  };

  this.renderTemplate = function renderTemplate(template) {
    for (var i = 0, arg; arg = arguments[++i];) {
      template = template.replace('{' + (i - 1) + '}', arg);
    }
    return template;
  };

  this.l10n = function l10n(module, key, args) {
    return navigator.mozL10n.get(Evme.Utils.l10nKey(module, key), args);
  };
  this.l10nAttr = function l10nAttr(module, key, args) {
    var attr = 'data-l10n-id="' + Evme.Utils.l10nKey(module, key) + '"';

    if (args) {
      try {
        attr += ' data-l10n-args="' +
                            JSON.stringify(args).replace(/"/g, '&quot;') + '"';
      } catch (ex) {

      }
    }

    return attr;
  };
  this.l10nKey = function l10nKey(module, key) {
    return ('evme-' + module + '-' + key).toLowerCase();
  };
  this.l10nParseConfig = function l10nParseConfig(text) {
    if (typeof text === 'string') {
      return text;
    }

    var firstLanguage = Object.keys(text)[0],
        currentLang = navigator.mozL10n.language.code || firstLanguage,
        translation = text[currentLang] || text[firstLanguage] || '';

    return translation;
  };

  this.shortcutIdToKey = function l10nShortcutKey(experienceId) {
    var map = Evme.__config.shortcutIdsToL10nKeys || {};
    return map[experienceId.toString()] || experienceId;
  };

  this.uuid = function generateUUID() {
    var url = window.URL.createObjectURL(uuidBlob),
        id = url.replace('blob:', '');

    window.URL.revokeObjectURL(url);

    return id;
  };

  this.rem = function(value) {
    return value / 10 + 'rem';
  };

  this.sendToOS = function sendToOS(type, data) {
    switch (type) {
      case OSMessages.OPEN_URL:
        return EvmeManager.openUrl(data.url);
      case OSMessages.SHOW_MENU:
        return EvmeManager.menuShow();
      case OSMessages.HIDE_MENU:
        return EvmeManager.menuHide();
      case OSMessages.MENU_HEIGHT:
        return EvmeManager.getMenuHeight();
      case OSMessages.GET_ICON_SIZE:
        return EvmeManager.getIconSize();
      case OSMessages.EVME_OPEN:
        EvmeManager.isEvmeVisible(data.isVisible);
        break;
      case OSMessages.SET_WALLPAPER:
        return EvmeManager.setWallpaper(data);
    }
  };

  this.getID = function getID() {
    return CONTAINER_ID;
  };

  this.getContainer = function getContainer() {
    return elContainer;
  };

  this.getOverlay = function getOverlay() {
    return elOverlay;
  };

  this.getOSIconSize = function getOSIconSize() {
    return OS_ICON_SIZE;
  };

  this.getScopeElements = function getScopeElements() {
    return document.querySelectorAll('.' + SCOPE_CLASS);
  };

  this.cloneObject = function cloneObject(obj) {
    return JSON.parse(JSON.stringify(obj));
  };

  this.valuesOf = function values(obj) {
    return Object.keys(obj).map(function getValue(key) {
      return obj[key];
    });
  };

  // remove installed apps from clouds apps
  this.dedupInstalledApps = function dedupInstalledApps(apps, installedApps) {
    var dedupCloudAppsBy = [];

    // first construct the data to filter by (an array of objects)
    // currently only the URL is relevant
    for (var i = 0, appData; appData = installedApps[i++];) {
    dedupCloudAppsBy.push({
      'favUrl': appData.favUrl,
      'appUrl': appData.favUrl
    });
    }

    return self.dedup(apps, dedupCloudAppsBy);
  };

  // remove from arrayOrigin according to rulesToRemove
  // both arguments are arrays of objects
  this.dedup = function dedup(arrayOrigin, rulesToRemove) {
    for (var i = 0, item; item = arrayOrigin[i++];) {
    for (var j = 0, rule; rule = rulesToRemove[j++];) {
      for (var property in rule) {
      // if one of the conditions was met,
      // remove the item and continue to next item
      if (item[property] === rule[property]) {
        arrayOrigin.splice(i - 1, 1);
        j = rulesToRemove.length;
        break;
      }
      }
    }
    }

    return arrayOrigin;
  };

  // resize = false: use the icon's size, but pad it
  // resize = true: resize the icon to the OS' size
  this.padIconForOS = function padIconForOS(options) {
    var icon = options.icon,
      resize = !! options.resize,
      callback = options.callback;

    if (typeof icon === 'string') {
      var src = icon;
      icon = new Image();
      icon.onload = handleIcon;
      icon.src = src;
    } else {
      handleIcon();
    }

    function handleIcon() {
      var padding = self.OS_ICON_PADDING,
          width = resize ? OS_ICON_SIZE : icon.width,
          height = resize ? OS_ICON_SIZE : icon.height,
          newWidth = width - padding,
          newHeight = height - padding,
          elCanvas = document.createElement('canvas'),
          context = elCanvas.getContext('2d');

      elCanvas.width = width;
      elCanvas.height = height;
      context.drawImage(icon, (width - newWidth) / 2, (height - newHeight) / 2,
        newWidth, newHeight);

      callback(elCanvas.toDataURL());
    }
  };

  this.getRoundIcon = function getRoundIcon(options, callback) {
    var size = options.size || OS_ICON_SIZE,
        img = new Image();

    img.onload = function() {
      var canvas = document.createElement('canvas'),
          ctx = canvas.getContext('2d');

      canvas.width = size;
      canvas.height = size;

      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 2 * Math.PI, false);
      ctx.clip();

      ctx.drawImage(img, 0, 0, size, size);

      callback(canvas.toDataURL());
    };
    img.src = self.formatImageData(options.src);
  };

  /**
   * Round all icons in an icon map object
   * @param  {Object}   iconsMap {1: src1, 2: src2 ...}
   * @param  {Function} callback Function to call when done
   */
  this.roundIconsMap = function roundIconsMap(iconsMap, callback) {
    var total = Object.keys(iconsMap).length,
        roundedIconsMap = {},
        processed = 0;

    if (total === 0) {
      callback(iconsMap);
      return;
    }

    for (var id in iconsMap) {
      var src = Evme.Utils.formatImageData(iconsMap[id]);

      (function roundIcon(id, src) {
        Evme.Utils.getRoundIcon({
          'src': src
        }, function onRoundIcon(roundIcon) {
          roundedIconsMap[id] = roundIcon;

          if (++processed === total) {
            callback(roundedIconsMap);
          }
        });
      })(id, src);
    }
  };

  this.writeTextToCanvas = function writeTextToCanvas(options) {
    var context = options.context,
      text = options.text ? options.text.split(' ') : [],
      offset = options.offset || 0,
      lineWidth = 0,
      currentLine = 0,
      textToDraw = [],

      WIDTH = context.canvas.width,
      FONT_SIZE = options.fontSize || self.APPS_FONT_SIZE,
      LINE_HEIGHT = FONT_SIZE + window.devicePixelRatio;

    if (!context || !text.length) {
      return false;
    }

    context.save();

    context.textAlign = 'center';
    context.textBaseline = 'top';
    context.fillStyle = 'rgba(255,255,255,1)';
    context.font = '500 ' + self.rem(FONT_SIZE) + ' sans-serif';

    // text shadow
    context.shadowOffsetX = self.APP_NAMES_SHADOW_OFFSET_X;
    context.shadowOffsetY = self.APP_NAMES_SHADOW_OFFSET_Y;
    context.shadowBlur = self.APP_NAMES_SHADOW_BLUR;
    context.shadowColor = self.APP_NAMES_SHADOW_COLOR;

    for (var i = 0, word; word = text[i++];) {
      // add 1 to the word with because of the space between words
      var size = context.measureText(word + ' ').width,
        draw = false,
        pushed = false;

      if (lineWidth + size >= WIDTH) {
        draw = true;
        if (textToDraw.length === 0) {
          textToDraw.push(word);
          pushed = true;
        }
      }

      if (draw) {
        drawText(textToDraw, WIDTH / 2, offset + currentLine * LINE_HEIGHT);
        currentLine++;
        textToDraw = [];
        lineWidth = 0;
      }

      if (!pushed) {
        textToDraw.push(word);
        lineWidth += size;
      }
    }

    if (textToDraw.length > 0) {
      drawText(textToDraw, WIDTH / 2, offset + currentLine * LINE_HEIGHT);
    }

    function drawText(text, x, y) {
      var isSingleWord, size;

      isSingleWord = text.length === 1;
      text = text.join(' ');
      size = context.measureText(text).width;

      if (isSingleWord && size >= WIDTH) {
        while (size >= WIDTH) {
          text = text.substring(0, text.length - 1);
          size = context.measureText(text + '…').width;
        }

        text += '…';
      }

      context.fillText(text, x, y);
    }

    context.restore();

    return true;
  };

  this.isNewUser = function isNewUser() {
    if (newUser === undefined) {
      Evme.Storage.get('counter-ALLTIME', function storageGot(value) {
        newUser = !value;
      });
    }
    return newUser;
  };

  this.formatImageData = function formatImageData(image) {
    if (!image || typeof image !== 'object') {
      return image;
    }
    if (image.MIMEType === 'image/url') {
      return image.data;
    }
    if (!image.MIMEType || image.data.length < 10) {
      return null;
    }
    if (self.isBlob(image)) {
      return self.EMPTY_IMAGE;
    }

    return 'data:' + image.MIMEType + ';base64,' + image.data;
  };

  this.getDefaultAppIcon = function getDefaultAppIcon() {
    return Evme.Config.design.apps.defaultAppIcon[this.PIXEL_RATIO_NAME];
  };

  this.getIconGroup = function getIconGroup(numIcons) {
    // valid values are 1,2,3
    numIcons = Math.max(numIcons, 1);
    numIcons = Math.min(numIcons, 3);
    return self.cloneObject(Evme.__config.iconsGroupSettings[numIcons]);
  };

  this.getIconsFormat = function getIconsFormat() {
    return iconsFormat || _getIconsFormat();
  };

  this.isBlob = function isBlob(arg) {
    return arg instanceof Blob;
  };

  this.blobToDataURI = function blobToDataURI(blob, cbSuccess, cbError) {
    if (!self.isBlob(blob)) {
      cbError && cbError();
      return;
    }

    var reader = new FileReader();
    reader.onload = function() {
      cbSuccess(reader.result);
    };
    reader.onerror = function() {
      cbError && cbError();
    };

    reader.readAsDataURL(blob);
  };

  /**
   * Append or overrite a url string with query parameter key=value.
   * insertParam('app://homescreen.gaiamobile.org:8080', 'appId', 123) =>
   *   app://homescreen.gaiamobile.org:8080?appId=123
   *
   * adopted from http://stackoverflow.com/a/487049/1559840
   */
  this.insertParam = function insertParam(url, key, value) {
    key = encodeURI(key);
    value = encodeURI(value);

    var parts = url.split('?');
    var domain = parts[0];
    var search = parts[1] || '';
    var kvp = search.split('&');

    var i = kvp.length;
    var x;
    while (i--) {
      x = kvp[i].split('=');

      if (x[0] == key) {
        x[1] = value;
        kvp[i] = x.join('=');
        break;
      }
    }

    if (i < 0) {
      kvp[kvp.length] = [key, value].join('=');
    }

    return domain + '?' + kvp.filter(function isEmpty(pair) {
      return pair !== '';
    }).join('&');
  };

  /**
   * Get a query parameter value from a url
   * extractParam('app://homescreen.gaiamobile.org:8080?appId=123', appId)
   *   => 123
   */
  this.extractParam = function extractParam(url, key) {
    var search = url.split('?')[1];
    if (search) {
      var kvp = search.split('&');
      for (var i = 0; i < kvp.length; i++) {
        var pair = kvp[i];
        if (key === pair.split('=')[0]) {
          return pair.split('=')[1];
        }
      }
    }
    return undefined;
  };

  this.setKeyboardVisibility = function setKeyboardVisibility(value) {
    if (self.isKeyboardVisible === value) { return; }

    self.isKeyboardVisible = value;

    if (self.isKeyboardVisible) {
      document.body.classList.add(CLASS_WHEN_KEYBOARD_IS_VISIBLE);
    } else {
      document.body.classList.remove(CLASS_WHEN_KEYBOARD_IS_VISIBLE);
    }
  };

  this.systemXHR = function systemXHR(options) {
    var url = options.url,
        responseType = options.responseType || '',
        onSuccess = options.onSuccess || self.NOOP,
        onError = options.onError || self.NOOP;

    var xhr = new XMLHttpRequest({
      mozAnon: true,
      mozSystem: true
    });

    xhr.open('GET', url, true);
    xhr.responseType = responseType;

    try {
      xhr.send(null);
    } catch (e) {
      onError(e);
      return;
    }

    xhr.onerror = onError;

    xhr.onload = function onload() {
      var status = xhr.status;
      if (status !== 0 && status !== 200) {
        onError();
      } else {
        onSuccess(xhr.response);
      }
    };
  };

  this.connection = function _connection() {
    return connection;
  };

  this.isOnline = function isOnline(callback) {
     Connection.online(callback);
  };

  this.getUrlParam = function getUrlParam(key) {
    return parsedQuery[key];
  };

  /*
    Serializes a json object into a querystring
   */
  this.serialize = function serialize(params) {
      var paramArray = [];

      for (var k in params) {
          var value = params[k],
              finalValue = '';

          if (typeof value !== 'undefined') {
              // if not object
              if (!(value instanceof Object)) {
                  finalValue = value;
              // if object and isn't empty
              } else if (Object.keys(value).length) {
                  finalValue = JSON.stringify(value);
              }
              paramArray.push(k + '=' + encodeURIComponent(finalValue));
          }
      }
      return paramArray.join('&');
  };

  this.cssPrefix = function _cssPrefix() {
    return cssPrefix;
  };

  this.convertIconsToAPIFormat = function convertIconsToAPIFormat(icons) {
    var aIcons = [];
    if (icons instanceof Array) {
      for (var i = 0; i < icons.length; i++) {
        aIcons.push(f(icons[i]));
      }
    } else {
      for (var i in icons) {
        aIcons.push(f(icons[i]));
      }
    }
    aIcons = aIcons.join(',');
    return aIcons;

    function f(icon) {
      return (icon && icon.id && icon.revision && icon.format) ?
              icon.id + ':' + icon.revision + ':' + icon.format : '';
    }
  };

  this.hasFixedPositioning = function hasFixedPositioning() {
    return false;
  };

  this.isVersionOrHigher = function isVersionOrHigher(v1, v2) {
    if (!v2) { v2 = v1; v1 = Evme.Utils.getOS().version; }
    if (!v1) { return undefined; }

    var v1parts = v1.split('.');
    var v2parts = v2.split('.');

    for (var i = 0; i < v1parts.length; ++i) {
      if (v2parts.length == i) {
        return true;
      }

      if (v1parts[i] == v2parts[i]) {
        continue;
      } else if (parseInt(v1parts[i], 10) > parseInt(v2parts[i], 10)) {
        return true;
      } else {
        return false;
      }
    }

    if (v1parts.length != v2parts.length) {
      return false;
    }

    return true;
  };

  this.User = new function User() {
    this.creds = function creds() {
      var credsFromCookie = Evme.Utils.Cookies.get(COOKIE_NAME_CREDENTIALS);
      return credsFromCookie;
    };
  };

  this.Cookies = new function Cookies() {
    this.set = function set(name, value, expMinutes, _domain) {
      var expiration = '',
          path = norm('path', '/'),
          domain = norm('domain', _domain);

      if (expMinutes) {
        expiration = new Date();
        expiration.setMinutes(expiration.getMinutes() + expMinutes);
        expiration = expiration.toGMTString();
      }
      expiration = norm('expires', expiration);

      var s = name + '=' + escape(value) + expiration + path + domain;

      try {
        document.cookie = s;
      } catch (ex) {}

      return s;
    };

    this.get = function get(name) {
      var results = null;

      try {
        results = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
      } catch (ex) {}

      return (results) ? unescape(results[2]) : null;
    };

    this.remove = function remove(name) {
      Evme.Utils.Cookies.set(name, '', 'Thu, 24-Jun-1999 12:34:56 GMT');
    };

    function norm(k, v) {
      return k && v ? '; ' + k + '=' + v : '';
    }
  };

  // check that cookies are enabled by setting and getting a temp cookie
  this.bCookiesEnabled = function bCookiesEnabled() {
    var key = 'cookiesEnabled',
        value = 'true';

    // set
    self.Cookies.set(key, value, 10);

    // get and check
    if (self.Cookies.get(key) === value) {
      self.Cookies.remove(key);
      return true;
    }
  };

  // check that localStorage is enabled by setting and getting a temp value
  this.bLocalStorageEnabled = function bLocalStorageEnabled() {
    return Evme.Storage.enabled();
  };

  /**
   * Escape special characters in `s` so it can be used for creating a RegExp
   * source: http://stackoverflow.com/a/3561711/1559840
   */
  this.escapeRegexp = function escapeRegexp(s) {
    return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  };

  // retrieves the value of a specified property from all
  // elements in the `collection`.
  this.pluck = function pluck(collection, property) {
    if (Array.isArray(collection)) {
      return collection.map(function(item) {
        return item[property];
      });
    } else {
      return [];
    }
  };

  /**
   * compare arrays of literals. will NOT work for array of objects.
   * @param  {Array} arr1
   * @param  {Array} arr2
   * @param  {Integer} limit  (optional) last index to compare
   * @return {Boolean}        true if arrays are identical
   */
  this.arraysEqual = function arraysEqual(arr1, arr2, limit) {
    var array1 = arr1.slice(0, limit || arr1.length);
    var array2 = arr2.slice(0, limit || arr2.length);

    if (array1.length !== array2.length) {
      return false;
    }

    for (var i = 0; i < array1.length; i++) {
      if (array1[i] !== array2[i]) {
        return false;
      }
    }

    return true;
  };

  // Creates a duplicate-value-free version of the `array`
  this.unique = function unique(array, property) {
    // array of objects, unique by `property` of the objects
    if (property) {
      var values = Evme.Utils.pluck(array, property);
      return array.filter(function(item, pos) {
        return uniqueFilter(item[property], pos, values);
      });
    }

    // array of literals
    else {
      return array.filter(uniqueFilter);
    }
  };

  this.aug = function aug() {
    var main = arguments[0] || {};
    for (var i = 1, arg; arg = arguments[i++];) {
      for (var k in arg) { main[k] = arg[k]; }
    }
    return main;
  };

  function uniqueFilter(elem, pos, self) {
    // if first appearance of `elem` is `pos` then it is unique
    return self.indexOf(elem) === pos;
  }

  function _getIconsFormat() {
    return self.ICONS_FORMATS.Large;
  }

  function getCSSPrefix() {
    return (/webkit/i).test(navigator.appVersion) ? '-webkit-' :
        (/firefox/i).test(navigator.userAgent) ? '-moz-' :
        (/msie/i).test(navigator.userAgent) ? '-ms-' :
        'opera' in window ? '-o-' : '';
  }

  this.getCurrentSearchQuery = function getCurrentSearchQuery() {
    return Evme.Brain.Searcher.getDisplayedQuery();
  };

  this.getAppsSignature = function getAppsSignature(apps) {
    // prepend with number of apps for quick comparison (fail early)
    var key = '' + apps.length;
    for (var i = 0, app; app = apps[i++];) {
      key += app.id + ':' + app.appUrl + ',';
    }
    return key || this.EMPTY_APPS_SIGNATURE;
  };

  var Connection = new function Connection() {
    var self = this,
        currentIndex,
        consts = {
          SPEED_UNKNOWN: 100,
          SPEED_HIGH: 30,
          SPEED_MED: 20,
          SPEED_LOW: 10
        },
        types = [
          {
            'name': undefined,
            'speed': consts.SPEED_UNKNOWN
          },
          {
            'name': 'etherenet',
            'speed': consts.SPEED_HIGH
          },
          {
            'name': 'wifi',
            'speed': consts.SPEED_HIGH
          },
          {
            'name': '2g',
            'speed': consts.SPEED_LOW
          },
          {
            'name': '3g',
            'speed': consts.SPEED_MED
          }
        ];

    this.events = {
      MOBILE_CONNECTION_CHANGE: 'connChange'
    };

    this.init = function init() {
      window.addEventListener('online', self.setOnline);
      window.addEventListener('offline', self.setOffline);

      self.set();
    };

    this.setOnline = function setOnline() {
      Evme.EventHandler.trigger('Connection', 'online');
    };
    this.setOffline = function setOffline() {
      Evme.EventHandler.trigger('Connection', 'offline');
    };

    this.online = function online(callback) {
      callback(window.location.href.match(/_offline=true/) ?
                                                    false : navigator.onLine);
    };

    this.get = function get() {
      return getCurrent();
    };

    this.set = function set(index) {
       currentIndex =
        index || (navigator.connection && navigator.connection.type) || 0;
       return getCurrent();
    };

    this.addEventListener = function addEventListener(type, callback) {

      // mobile network connection change
      if (type === self.events.MOBILE_CONNECTION_CHANGE) {
      var conn = getMobileConnection();
      conn && conn.addEventListener('datachange', function() {
        // get data using convinience method in shared/js/mobile_operator.js
        var data = conn.voice && conn.voice.network &&
                                          MobileOperator.userFacingInfo(conn);
        callback(data);
      });
      }
    };

    function getCurrent() {
      return aug({}, consts, types[currentIndex]);
    }

    function aug() {
      var main = arguments[0];
      for (var i = 1, len = arguments.length; i < len; i++) {
        for (var k in arguments[i]) { main[k] = arguments[i][k]; }
      }
      return main;
    }

    function getMobileConnection() {
      // XXX: check bug-926169
      // this is used to keep all tests passing while introducing multi-sim APIs
      var mobileConnection = window.navigator.mozMobileConnection ||
        window.navigator.mozMobileConnections &&
          window.navigator.mozMobileConnections[0];

      return mobileConnection;
    }

    // init
    self.init();
  };
  this.Connection = Connection;

  this.init();
}

Evme.$ = function Evme_$(sSelector, elScope, iterationFunction) {
  var isById = sSelector.charAt(0) === '#',
    els = null;

  if (isById) {
    els = [document.getElementById(sSelector.replace('#', ''))];
  } else {
    els = (elScope || Evme.Utils.getContainer()).querySelectorAll(sSelector);
  }

  if (iterationFunction !== undefined) {
    for (var i = 0, el = els[i]; el; el = els[++i]) {
      iterationFunction.call(el, el);
    }
  }

  return isById ? els[0] : els;
};

Evme.$remove = function Evme_$remove(sSelector, scope) {
  if (typeof sSelector === 'object') {
    if (sSelector && sSelector.parentNode) {
      sSelector.parentNode.removeChild(sSelector);
    }
  } else {
    Evme.$(sSelector, scope, function itemIteration(el) {
      if (el && el.parentNode) {
        el.parentNode.removeChild(el);
      }
    });
  }
};


Evme.$create = function Evme_$create(tagName, attributes, html) {
  var el = document.createElement(tagName);

  if (attributes) {
    for (var key in attributes) {
      el.setAttribute(key, attributes[key]);
    }
  }

  if (html) {
    el.innerHTML = html;
  }

  return el;
};

Evme.$isVisible = function Evme_$isVisible(el) {
  return !!el.offsetWidth && getComputedStyle(el).visibility === 'visible';
};

Evme.htmlRegex = /</g;
Evme.html = function Evme_html(html) {
  return (html || '').replace(Evme.htmlRegex, '&lt;');
};
