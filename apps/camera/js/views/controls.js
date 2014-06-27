define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('view:controls');
var bind = require('lib/bind');
var View = require('view');
var Drag = require('drag');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'controls',
  className: 'test-controls',

  initialize: function() {
    this.render();
  },

  switchPositions: {
    left: 'picture',
    right: 'video',
    picture: 'left',
    video: 'right'
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

    this.drag = new Drag({
      handle: this.els.switchHandle,
      container: this.els.switch,
    });

    // Bind events
    bind(this.els.thumbnail, 'click', this.onButtonClick);
    bind(this.els.capture, 'click', this.onButtonClick);
    bind(this.els.cancel, 'click', this.onButtonClick);
    this.drag.on('ended', this.drag.snapToClosestEdge);
    this.drag.on('translate', this.onSwitchTranslate);
    this.drag.on('snapped', this.onSwitchSnapped);
    this.drag.on('tapped', this.onSwitchTapped);
    this.on('inserted', this.onInserted);

    debug('rendered');
  },

  onInserted: function() {
    this.drag.updateDimensions();
    this.drag.set({ x: this.switchPosition });
  },

  onSwitchSnapped: function(edges) {
    var mode = this.switchPositions[edges.x];
    var changed = mode !== this.get('mode');
    if (changed) { this.onSwitchChanged(mode); }
  },

  onSwitchChanged: function(mode) {
    this.emit('modechanged', mode);
  },

  onSwitchTapped: function() {
    debug('switch tapped');
    this.emit('modechanged');
  },

  onSwitchTranslate: function(e) {
    var skew = 2;
    var ratio = e.position.ratio.x * skew;
    var camera = Math.max(0, 1 - ratio);
    var video = Math.max(0, -1 + ratio);

    this.els.icons.camera.style.opacity = camera;
    this.els.icons.video.style.opacity = video;
    debug('opacity camera: %s, video: %s', camera, video);
  },

  onButtonClick: function(e) {
    e.stopPropagation();
    var name = e.currentTarget.getAttribute('name');
    var enabled = this.get('enabled');
    if (enabled === 'true') {
      this.emit('click:' + name, e);
    }
  },

  setMode: function(mode) {
    this.switchPosition = this.switchPositions[mode];
    this.drag.set({ x: this.switchPosition });
    this.set('mode', mode);
    debug('setMode mode: %s, pos: %s', mode, this.switchPosition);
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

  template: function() {
    /*jshint maxlen:false*/
    return '<div class="controls-left">' +
      '<div class="controls-button controls-thumbnail-button test-thumbnail js-thumbnail rotates" name="thumbnail"></div>' +
      '<div class="controls-button controls-cancel-pick-button test-cancel-pick icon-pick-cancel rotates js-cancel" name="cancel"></div>' +
    '</div>' +
    '<div class="controls-middle">' +
      '<div class="capture-button test-capture rotates js-capture" name="capture">' +
        '<div class="circle outer-circle"></div>' +
        '<div class="circle inner-circle"></div>' +
        '<div class="center icon"></div>' +
      '</div>' +
    '</div>' +
    '<div class="controls-right">' +
      '<div class="mode-switch test-switch" name="switch">' +
        '<div class="inner js-switch">' +
          '<div class="mode-switch_bg-icon icon-camera rotates"></div>' +
          '<div class="mode-switch_bg-icon icon-video rotates"></div>' +
          '<div class="mode-switch_handle js-switch-handle">' +
            '<div class="mode-switch_current-icon icon-camera rotates js-icon-camera"></div>' +
            '<div class="mode-switch_current-icon icon-video rotates js-icon-video"></div>' +
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
