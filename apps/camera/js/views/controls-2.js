define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var View = require('vendor/view');
var bind = require('lib/bind');
var attach = require('vendor/attach');

/**
 * Exports
 */

module.exports = View.extend({
  name: 'controls-2',
  className: 'test-controls',

  initialize: function() {
    this.render();
  },

  // render: function() {
  //   this.el.innerHTML = this.template();
  //   attach.on(this.el, 'click', '.js-switch', this.onSwitchClick);
  //   attach.on(this.el, 'click', '.js-btn', this.onButtonClick);
  //   this.els.timer = this.find('.js-video-timer');
  //   debug('rendered');
  // },

  render: function() {
    this.el.innerHTML = this.template();

    // Find elements
    this.els.toggle = this.find('.js-toggle');
    this.els.capture = this.find('.js-capture');
    this.els.thumbnail = this.find('.js-thumbnail');
    this.els.galleryButton = this.find('.js-gallery');
    this.els.cancelPickButton = this.find('.js-cancel-pick');

    // Bind events
    attach.on(this.el, 'click', '.js-capture', this.onButtonTap);
    //bind(this.els.toggle, 'change', this.onModeToggle);
    //bind(this.els.capture, 'click', this.onButtonTap);
    // bind(this.els.galleryButton, 'click', this.onButtonClick);
    // bind(this.els.cancelPickButton, 'click', this.onButtonClick);
  },

  onButtonTap: function(e, el) {
    e.stopPropagation();
    var name = el.getAttribute('name');
    this.emit('tap:' + name, e);
  },

  template: function() {
    /*jshint maxlen:false*/
    return '' +
    '<div class="controls-2_left">' +
      '<div class="controls-2_thumbnail js-thumbnail"></div>' +
    '</div>' +
    '<div class="controls-2_middle">' +
      '<div class="capture-button-2 js-capture" name="capture">' +
        '<div class="circle outer-circle"></div>' +
        '<div class="circle inner-circle"></div>' +
        '<div class="center icon-camera"></div>' +
      '</div>' +
    '</div>' +
    '<div class="controls-2_right">' +
      '<label class="mode-toggle">' +
        '<input class="js-toggle" type="checkbox"/>' +
        '<div class="mode-toggle_switch"></div>' +
      '</label>' +
    '</div>';
  },

  setThumbnail: function(blob) {
    if (!this.els.image) {
      this.els.image = new Image();
      this.els.thumbnail.appendChild(this.els.image);
    }
    this.els.image.src = window.URL.createObjectURL(blob);
  },

  onModeToggle: function(e) {
    this.emit('tap:switch');
  }
});

// define(function(require, exports, module) {
// 'use strict';

// /**
//  * Dependencies
//  */

// var View = require('vendor/view');
// var bind = require('utils/bind');
// var find = require('utils/find');
// // var formatTimer = require('utils/formattimer');



// /**
//  * Exports
//  */

// module.exports = View.extend({
//   className: 'controls js-controls',
//   buttonsDisabledClass: 'buttons-disabled',
//   initialize: function() {
//     this.render();
//   },

//   render: function() {
//     this.el.innerHTML = this.template();

//     // Find elements
//     this.els.toggle = this.find('.js-toggle');
//     this.els.capture = this.find('.js-capture');
//     this.els.timer = this.find('.js-video-timer');
//     this.els.thumbnail = this.find('.js-thumbnail');
//     this.els.galleryButton = this.find('.js-gallery');
//     this.els.cancelPickButton = this.find('.js-cancel-pick');

//     // Bind events
//     bind(this.els.toggle, 'change', this.onModeToggle);
//     bind(this.els.capture, 'click', this.onButtonClick);
//     // bind(this.els.galleryButton, 'click', this.onButtonClick);
//     // bind(this.els.cancelPickButton, 'click', this.onButtonClick);
//   },

//   template: function() {
//     /*jshint maxlen:false*/
//     return '' +
//     '<div class="controls_left">' +
//       '<div class="controls_thumbnail js-thumbnail"></div>' +
//     '</div>' +
//     '<div class="controls_middle">' +
//       '<div class="capture-button js-capture" name="capture">' +
//         '<div class="circle outer-circle"></div>' +
//         '<div class="circle middle-circle"></div>' +
//         '<div class="circle inner-circle"></div>' +
//         '<div class="center"></div>' +
//       '</div>' +
//     '</div>' +
//     '<div class="controls_right">' +
//       '<label class="mode-toggle">' +
//         '<input class="js-toggle" type="checkbox"/>' +
//         '<div class="mode-toggle_switch"></div>' +
//       '</label>' +
//     '</div>';
//   },

//   setThumbnail: function(blob) {
//     if (!this.els.image) {
//       this.els.image = new Image();
//       this.els.thumbnail.appendChild(this.els.image);
//     }
//     this.els.image.src = window.URL.createObjectURL(blob);
//   },

//   onModeToggle: function(e) {
//     var mode = this.els.toggle.checked ? 'video' : 'camera';
//     this.data('mode', mode);
//     this.emit('change:mode', mode);
//   }
// });

// });

});
