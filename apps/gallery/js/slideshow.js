'use strict';

var SlideStyles = {
  'sliding': {
    type: 'MozTransition',
    target: 'MozTransform',
    styles:
      ['translateX(-99.99%) translateZ(1px)',
      'translateX(0) translateZ(1px)',
      'translateX(100%) translateZ(1px)'],
    initStyle: 'sliding'
  },
  'fade': {
    type: 'MozTransition',
    target: 'opacity',
    styles:
      ['0', '1', '0'],
    initStyle: 'fade'
  }
};

var SlideFrame = function(config) {
  this.config = config;

  this.frame = document.createElement('div');
  this.frame.className = 'slide ' + this.config.initStyle;
  this.config.container.appendChild(this.frame);

  switch (this.config.transitType) {
    case 'MozTransition':
      this.frame.addEventListener('transitionend',
        this.config.callback.bind(this));
      break;
    case 'MozAnimation':
      this.frame.addEventListener('animationend',
        this.config.callback.bind(this));
      break;
  }
};

SlideFrame.prototype.enableAnimate = function() {
  this.frame.classList.add('in-animating');
  switch (this.config.transitType) {
    case 'MozTransition':
      this.frame.style.MozTransitionDuration =
        this.config.duration;
      this.frame.style.MozTransitionDelay =
        this.config.delay;
      break;
    case 'MozAnimation':
      this.frame.style.MozAnimationDuration =
        this.config.dutation;
      this.frame.style.MozTransitionDelay =
        this.config.delay;
      break;
  }
};

SlideFrame.prototype.disableAnimate = function() {
  this.frame.classList.remove('in-animating');
  switch (this.config.transitType) {
    case 'MozTransition':
      this.frame.style.MozTransitionDuration = '';
      this.frame.style.MozTransitionDelay = '';
      break;
    case 'MozAnimation':
      this.frame.style.MozAnimationDuration = '';
      this.frame.style.MozTransitionDelay = '';
      break;
  }
};

SlideFrame.prototype.remove = function() {
  this.clear();
  this.frame.parentElement.removeChild(this.frame);
};

SlideFrame.prototype.clear = function() {
  this.frame.style.backgroundImage = '';
};

SlideFrame.prototype.loadPic = function(imageFile) {
  var src = URL.createObjectURL(imageFile);
  this.frame.style.backgroundImage = 'url(' + src + ')';
};

SlideFrame.prototype.applyStyle = function(key, style) {
  setTimeout(function() {
    this.frame.style[key] = style;
  }.bind(this));
};


// Please assign files & db to the pictures array
// init or run it when most pictures are loaded

var SlideShow = {
  container: null,
  transitionDuration: '2s', // Default
  transitionDelay: '1s', // Default

  files: [],
  fileIndex: -1,

  slides: [],
  slideOrder: [],
  slideIndex: 0,
  // container, slideType, slides duration, stop delay, endTime
  config: null,

  slideType: {},

  hasInit: false,
  canRun: false,
  hasTransitedNum: 0,

  db: null,

  // When user stop slide show, the gallery should display at the current
  // picture.
  get lastDisplayPicIndex() {
    var dom = document.elementFromPoint(
      window.innerWidth / 2, window.innerHeight / 2);
    return dom.dataset.picindex;
  },

  init: function ss_init(config) {
    if (this.hasInit)
      return;

    // load config
    this.config = config || this.config || {};

    this.slideType =
      this.config.slideType ?
      SlideStyles[this.config.slideType] :
      SlideStyles['sliding'];

    this.container = this.config.container ||
        document.getElementById('slides');
    // prepare slide config
    var slideConfig = {
      container: this.container,
      transitType: this.slideType.type,
      initStyle: this.slideType.initStyle,
      duration:
        this.config.transitionDuration || this.transitionDuration,
      delay:
        this.config.transitionDelay || this.transitionDelay,
      callback: this.handleAnimateEnd
    };

    // insert frames
    this.initSlides(slideConfig);
  },

  initSlides: function ss_initSlides(slideConfig) {
    for (var i = 0; i < this.slideType.styles.length; i++) {
      var slide = new SlideFrame(slideConfig);
      slide.id = i;

      this.loadNextFile(slide);

      slide.applyStyle(
        this.slideType.target, this.slideType.styles[i]);
      this.slides.push(slide);
    }
    this.hasInit = true;
  },

  run: function ss_run() {
    this.canRun = true;
    if (!this.hasInit) {
      this.init();
      setTimeout(this.next.bind(this));
    } else {
      this.next();
    }
  },

  clear: function ss_clear() {
    this.hasInit = false;
    this.canRun = false;
    for (var i = 0; i < this.slides.length; i++) {
      this.slides[i].remove();
    }
    this.slides.length = 0;
  },

  stop: function ss_stop() {
    // stop rotate
    this.canRun = false;
  },

  handleAnimateEnd: function ss_handleAnimateEnd() {
    // handle when first frame's animation end
    SlideShow.hasTransitedNum += 1;

    if (SlideShow.hasTransitedNum === SlideShow.slides.length - 1)
      SlideShow.next();
  },

  next: function ss_next() {
    if (!this.canRun)
      return;

    this.hasTransitedNum = 0;
    this.slideOrder = this.nextSlides();

    // update first picture
    var firstSlide =
      this.slides[this.slideOrder[0]];
    this.loadNextFile(firstSlide);

    // enable animate except the last one
    for (var i = 0; i < this.slideOrder.length; i++) {
      var slide = this.slides[i];
      slide.lastOne = false;
      if (slide !== firstSlide) {
        slide.enableAnimate();
      } else {
        slide.disableAnimate();
      }
    }

    // apply next styles
    for (var i = 0; i < this.slideOrder.length; i++) {
      var slide = this.slides[this.slideOrder[i]];
      slide.applyStyle(this.slideType.target, this.slideType.styles[i]);
    }
  },
  loadNextFile: function ss_loadNextFile(slide) {
    var file;

    if (this.files.length === 0)
      return;

    if (this.files[this.fileIndex + 1]) {
      this.fileIndex += 1;
    } else {
      this.fileIndex = 0;
    }
    file = this.files[this.fileIndex];

    if (!file || file.metadata.video) {
      this.loadNextFile(slide);
      return;
    }

    if (file.name === slide.filename)
      return;

    slide.filename = file.name;
    slide.frame.dataset.picindex = this.fileIndex;

    this.db.getFile(file.name, function(imagefile) {
      slide.loadPic(imagefile);
    }.bind(this));
  },
  // A, B, C => C, A, B => B, C, A => A, B, C
  nextSlides: function ss_nextSlides() {
    var total = this.slides.length;
    var result = [];

    this.slideIndex = this.nextIndex(this.slides, this.slideIndex);
    for (var i = 0; i < total; i++) {
      var key = (this.slideIndex + i) % total;
      result[key] = i;
    }
    return result;
  },
  nextIndex: function ss_nextIndex(array, index) {
    return array[index + 1] ? (index + 1) : 0;
  }
};
