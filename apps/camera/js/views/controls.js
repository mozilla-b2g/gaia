define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:controls');
var debounce = require('lib/debounce');
var bind = require('lib/bind');
var View = require('view');
var Drag = require('drag');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'controls',
  className: 'test-controls',

  initialize: function(options) {
    this.drag = options && options.drag; // test hook
    this.once('inserted', this.setupSwitch);
    this.render();
  },

  switchPositions: {
    left: 'picture',
    right: 'video',
    picture: 0,
    video: 1
  },

  tapTimeout: 180,

  // {node}: {data-l10n-id} pairs used for localization.
  elsL10n: {
    cancel: 'controls-button-close',
    thumbnail: 'preview-button',
    capture: 'capture-button'
  },

  render: function() {
    this.el.innerHTML = this.template();

    // Get nodes
    this.els.switchHandle = this.find('.js-switch-handle');
    this.els.thumbnail = this.find('.js-thumbnail');
    this.els.capture = this.find('.js-capture');
    this.els.cancel = this.find('.js-cancel');
    this.els.switch = this.find('.js-switch');
    this.els.icons = {
      camera: this.find('.js-icon-camera'),
      video: this.find('.js-icon-video')
    };

    // Clean up
    delete this.template;

    debug('rendered');
    return this.bindEvents();
  },

  /**
   * Respond to click events on the buttons
   * other than the switch, which is a special
   * case.
   *
   * We 'debouce' the callback to defend
   * against button-bashing.
   *
   * @return {ControlsView} for chaining
   * @private
   */
  bindEvents: function() {
    this.onButtonClick = debounce(this.onButtonClick, 300, true);
    bind(this.els.thumbnail, 'click', this.onButtonClick);
    bind(this.els.capture, 'click', this.onButtonClick);
    bind(this.els.cancel, 'click', this.onButtonClick);
    return this;
  },

  /**
   * Create the draggable switch.
   *
   * We debouce the tapped callback to
   * defend against button-bashing.
   *
   * @private
   */
  setupSwitch: function() {
    debug('setup dragger');

    // Wait until the document is complete
    // to avoid any forced sync reflows.
    if (document.readyState !== 'complete') {
      window.addEventListener('load', this.setupSwitch);
      debug('deferred switch setup till after load');
      return;
    }

    var handleBounds = this.els.switchHandle.getBoundingClientRect();
    var containerBounds = this.els.switch.getBoundingClientRect();

    // Prefer existing drag (test hook)
    this.drag = this.drag || new Drag({
      handle: {
        el: this.els.switchHandle,
        width: handleBounds.width,
        height: handleBounds.height,
        x: handleBounds.left - containerBounds.left,
        y: handleBounds.top - containerBounds.top
      },
      container: {
        el: this.els.switch,
        width: containerBounds.width,
        height: containerBounds.height,
        x: containerBounds.left,
        y: containerBounds.right
      }
    });

    this.drag.on('ended', this.onSwitchEnded);
    this.drag.on('translate', this.onSwitchTranslate);
    this.drag.on('snapped', this.onSwitchSnapped);

    this.updateSwitchPosition();

    // Tidy up
    window.removeEventListener('load', this.setupSwitch);
  },

  setCaptureLabel: function(recording) {
    this.els.capture.setAttribute('data-l10n-id',
      recording ? 'stop-capture-button' : 'capture-button');
  },

  onSwitchEnded: function() {
    var delta;
    var now = new Date().getTime();
    if (this.translateStart) {
      delta = now - this.translateStart;
      debug('switch ended: %d (%d)', now, delta);
      delete this.translateStart;
      if (delta < this.tapTimeout) {
        this.onSwitchChanged();
        return;
      }
    }
    this.drag.snap();
    delete this.translateStart;
  },

  onSwitchSnapped: function() {
    debug('switch snapped');
    var mode = this.switchPositions[this.drag.handle.x ? 'right' : 'left'];
    var changed = mode !== this.get('mode');
    if (changed) { this.onSwitchChanged(); }
  },

  onSwitchChanged: function() {
    this.emit('modechanged');
  },

  onSwitchTranslate: function(e) {
    var now = new Date().getTime();
    if (!this.translateStart) {
      this.translateStart = now;
    }
    debug('switch translate: %d (%d)', now, now - this.translateStart);
    this.setSwitchIcon((this.drag.handle.x / this.drag.max.x) || 0);
  },

  setSwitchIcon: function(ratio) {
    var skew = 2;
    var ratioSkewed = ratio * skew;
    var camera = Math.max(0, 1 - ratioSkewed);
    var video = Math.max(0, -1 + ratioSkewed);
    this.els.icons.camera.style.opacity = camera;
    this.els.icons.video.style.opacity = video;
    debug('set switch icon camera: %s, video: %s', camera, video);
  },

  /**
   * Set view screen reader visibility. In some cases, though the view is behind
   * an overlay and not hidden off screen, it still needs to be
   * hidden/inaccessible from the screen reader.
   */
  setScreenReaderVisible: function(visible) {
    this.el.setAttribute('aria-hidden', !visible);
  },

  onButtonClick: function(e) {
    e.stopPropagation();
    debug('button click');
    var name = e.currentTarget.getAttribute('name');
    this.emit('click:' + name, e);
  },

  suspendMode: function(suspended) {
    if (!this.drag) { return; }
    if (suspended) {
      this.drag.disable();
    } else {
      this.drag.enable();
    }
  },

  setMode: function(mode) {
    debug('set mode: %s', mode);
    this.set('mode', mode);
    this.switchPosition = this.switchPositions[mode];
    this.updateSwitchPosition();
    this.setSwitchIcon(this.switchPosition);
    // Set appropriate mode switch label for screen reader.
    this.els.switch.setAttribute('data-l10n-id', mode + '-mode-button');
    debug('mode set pos: %d', this.switchPosition);
  },

  updateSwitchPosition: function() {
    debug('updateSwitchPosition');
    if (!this.drag) { return; }
    this.drag.translate('' + this.switchPosition, 0);
    delete this.translateStart;
    debug('updated switch position: %d', this.switchPosition);
  },

  setThumbnail: function(blob) {
    if (!this.els.image) {
      this.els.image = new Image();
      this.els.image.classList.add('test-thumbnail');
      this.els.thumbnail.appendChild(this.els.image);
      this.set('thumbnail', true);
    } else {
      window.URL.revokeObjectURL(this.els.image.src);
    }

    this.els.image.src = window.URL.createObjectURL(blob);
    debug('thumbnail set');
  },

  removeThumbnail: function() {
    if (this.els.image) {
      this.els.thumbnail.removeChild(this.els.image);
      window.URL.revokeObjectURL(this.els.image.src);
      this.els.image = null;
    }

    this.set('thumbnail', false);
  },

  /**
   * NOTE: The below functions are a first
   * attempt at replacing the default View
   * `.set()`, `.enable()` and `.disable()` APIs
   * to avoid having to use attributes to style
   * state in our CSS.
   */

  set: function(key, value) {
    if (typeof key !== 'string') { return; }
    if (arguments.length === 1) { value = true; }
    if (!value) { return this.unset(key); }

    var attr = 'data-' + key;
    var oldValue = this.el.getAttribute(attr);
    var oldClass = oldValue && classFrom(key, oldValue);
    var newClass = classFrom(key, value);

    if (oldClass) { this.el.classList.remove(oldClass); }
    if (newClass) { this.el.classList.add(newClass); }

    this.el.setAttribute(attr, value);
    debug('remove: %s, add: %s', oldClass, newClass);
    debug('attr key: %s, value: %s', attr, value);
  },

  get: function(key) {
    var attr = 'data-' + key;
    return this.el.getAttribute(attr);
  },

  unset: function(key) {
    var attr = 'data-' + key;
    var value = this.el.getAttribute(attr);
    this.el.classList.remove(classFrom(key, value));
    this.el.removeAttribute(attr);
  },

  enable: function(key) {
    this.set(key ? key + '-enabled' : 'enabled');
    this.unset(key ? key + '-disabled' : 'disabled');
  },

  disable: function(key) {
    this.set(key ? key + '-disabled' : 'disabled');
    this.unset(key ? key + '-enabled' : 'enabled');
  },

  /**
   * Localize the template based on a list of localizable elements - elsL10n. In
   * case the template is loaded before l10n is ready, localize will peform the
   * initial localization.
   */
  localize: function() {
    for (var el in this.elsL10n) {
      // Resetting data-l10n-id will trigger localization for the el.
      this.els[el].setAttribute('data-l10n-id', this.elsL10n[el]);
    }
    // Switch mode label depends on the mode that is currently set.
    var mode = this.get('mode') || 'picture';
    this.els.switch.setAttribute('data-l10n-id', mode + '-mode-button');
  },

  template: function() {
    /*jshint maxlen:false*/
    return '<div class="controls-left">' +
      '<div class="controls-button controls-thumbnail-button test-thumbnail js-thumbnail rotates" ' +
        'name="thumbnail" role="button" data-l10n-id="preview-button"></div>' +
      '<div class="controls-button controls-cancel-pick-button test-cancel-pick rotates js-cancel" ' +
        'name="cancel" data-icon="close" role="button" data-l10n-id="controls-button-close"></div>' +
    '</div>' +
    '<div class="controls-middle">' +
      '<div class="capture-button test-capture rotates js-capture" name="capture" ' +
        'data-l10n-id="capture-button" role="button">' +
        '<div class="circle outer-circle"></div>' +
        '<div class="circle inner-circle"></div>' +
        '<div class="center" data-icon="camera" aria-hidden="true"></div>' +
      '</div>' +
    '</div>' +
    '<div class="controls-right">' +
      '<div class="mode-switch test-switch" name="switch">' +
        '<div class="inner js-switch" role="button">' +
          '<div class="mode-switch_bg-icon rotates" data-icon="camera" aria-hidden="true"></div>' +
          '<div class="mode-switch_bg-icon rotates" data-icon="video" aria-hidden="true"></div>' +
          '<div class="mode-switch_handle js-switch-handle" aria-hidden="true">' +
            '<div class="mode-switch_current-icon camera rotates js-icon-camera" data-icon="camera" aria-hidden="true"></div>' +
            '<div class="mode-switch_current-icon video rotates js-icon-video" data-icon="video" aria-hidden="true"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
});

/**
 * Examples:
 *
 *   classFrom('recording', true); //=> 'recording'
 *   classFrom('flash', 'on'); //=> 'flash-on'
 *   classFrom('recording', false); //=> ''
 *   classFrom('recording'); //=> 'recording'
 *   classFrom('recording', 'true'); //=> 'recording'
 *   classFrom('recording', 'false'); //=> ''
 *
 * @param  {String} key
 * @param  {*} value
 * @return {String}
 */
function classFrom(key, value) {
  value = detectBooleans(value);
  if (typeof value === 'boolean') {
    return value ? key : '';
  } else if (value) {
    return key + '-' + value ;
  } else {
    return key;
  }
}

function detectBooleans(value) {
  if (typeof value === 'boolean') { return value; }
  else if (value === 'true') { return true; }
  else if (value === 'false') { return false; }
  else { return value; }
}

});
