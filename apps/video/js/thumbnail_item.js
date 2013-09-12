/**
 * ThumbnailItem is view object for a single video data. It renders video with
 * the ThumbnailItem.Template. Before use it, The template should be
 * initialized. ThumbnailItem keeps the referenced video data, while dispatching
 * tap event, it supplies the video data as the argument. ThumbnailItem wraps
 * the dom event to its owned addTapListener. When we need to change the
 * behavior to trigger tap, we may just change the implementation layer here.
 *
 * CONSTRUCTOR:
 *   To create a ThumbnailItem objet requires the following argument:
 *      videoData: the video data object from mediadb.
 *
 * API:
 *   addTapListener: add tap event listener to this thumbnail item. args:
 *         listener: the listener callback.
 *   removeTapListener: remove tap event listener. args:
 *         listener: the listener callback.
 *   isSelected: indicate if this thumbnial is rendered as selected.
 *   setSelected: set this thumbnial as selected, or not. args:
 *          selected: a boolean for selected or not.
 *   setWatched: set this thumbnail item as watched or not. args:
 *          watched: a boolean for watched or not.
 *   updatePoster: update the poster image. args:
 *          imageblob: a image blob object.
 *
 * Properties:
 *   htmlNode: the HTML DOM node for this thumbnail item. It is rendered at the
 *             creation of object.
 *   data: the video data object bound with this thumbnail item.
 *   posterNode: the HTML DOM node for poster image. This property may be null
 *               if template doesn't supply one.
 *   unwatchedNode: the HTML DOM node for unwatched marker. This property may be
 *               null if template doesn't supply one.
 *   detailNode: the HTML DOM node for detail information. This property may be
 *               null if template doesn't supply one.
 *
 * Template Bindings:
 *
 */
function ThumbnailItem(videoData) {
  if (!videoData) {
    throw new Error('videoData should not be null or undefined.');
  }
  // the dom element hosting the poster image.
  this.posterNode = null;
  // the dom element for indicating watched or unwatched.
  this.unwatchedNode = null;
  // the detail dom element.
  this.detailNode = null;
  this.htmlNode = null;
  // array for hosting tap listeners.
  this.tapListeners = [];
  this.data = videoData;

  var _this = this;

  render();

  function detailsOverflowHandler(e) {
    var el = e.target;
    var title = el.firstElementChild;
    if (title.textContent.length > 5) {
      var max = (window.innerWidth > window.innerHeight) ? 175 : 45;
      var end = title.textContent.length > max ? max - 1 : -5;
      title.textContent = title.textContent.slice(0, end) + '\u2026';
      // Force element to be repainted to enable 'overflow' event
      // Can't repaint without the timeout maybe a gecko bug.
      el.style.overflow = 'visible';
      setTimeout(function() { el.style.overflow = 'hidden'; });
    }
  }

  function convertToDOM(htmlText) {
    // convert as DOM node
    var dummyDiv = document.createElement('div');
    dummyDiv.innerHTML = htmlText;

    var domNode = dummyDiv.firstElementChild;

    if (!domNode) {
      throw new Error('the template does not contain any element');
    }

    _this.htmlNode = domNode;
    // This is the element that displays the image blob
    _this.posterNode = domNode.querySelector('.img');
    // query details
    _this.detailNode = domNode.querySelector('.details');
    // query unwatched.
    _this.unwatchedNode = domNode.querySelector('.unwatched');
  }

  // the main function to render everything to UI.
  function render() {
    if (!ThumbnailItem.Template) {
      throw new Error('Template is needed while rendering');
    }
    // render title
    var duration = '';
    if (isFinite(_this.data.metadata.duration)) {
      var d = Math.round(_this.data.metadata.duration);
      duration = MediaUtils.formatDuration(d);
    }
    // render size
    var sizeText = isFinite(_this.data.size) ?
                   MediaUtils.formatSize(_this.data.size) : '';
    // render type
    var videoType = '';
    if (_this.data.type) {
      var pos = _this.data.type.indexOf('/');
      videoType = (pos > -1 ? _this.data.type.slice(pos + 1) : _this.data.type);
    }

    // popular html text
    var htmlText = ThumbnailItem.Template.interpolate({
      'title': _this.data.metadata.title,
      'duration-text': duration,
      'size-text': sizeText,
      'type-text': videoType
    });

    convertToDOM(htmlText);

    // This  is the image blob we display for the video.
    // If the video is part-way played, we display the bookmark image.
    // Otherwise we display the poster image from metadata parsing.
    var imageblob = _this.data.metadata.bookmark || _this.data.metadata.poster;
    if (imageblob) {
      _this.updatePoster(imageblob);
    }

    _this.setWatched(_this.data.metadata.watched);

    if (_this.detailNode) {
      _this.detailNode.dataset.title = _this.data.metadata.title;
      _this.detailNode.addEventListener('overflow', detailsOverflowHandler);
    }

    // add click event listeners.
    _this.htmlNode.addEventListener('click', dispatchClick);
  }

  function dispatchClick() {
    _this.tapListeners.forEach(function(listener) {
      if (listener.handleEvent) {
        listener.handleEvent(_this.data);
      } else if ((typeof listener) === 'function') {
        listener(_this.data);
      }
    });
  }
}

ThumbnailItem.prototype.addTapListener = function(listener) {
  if (!listener) {
    return;
  }
  this.tapListeners[this.tapListeners.length] = listener;
};

ThumbnailItem.prototype.removeTapListener = function(listener) {
  if (!listener) {
    return;
  }

  var idx = this.tapListeners.indexOf(listener);
  if (idx > -1) {
    this.tapListeners.splice(idx, 1);
  }
};

ThumbnailItem.prototype.isSelected = function() {
  return this.htmlNode.classList.contains('selected');
};

ThumbnailItem.prototype.setSelected = function(selected) {
  if (selected) {
    this.htmlNode.classList.add('selected');
  } else {
    this.htmlNode.classList.remove('selected');
  }
};

ThumbnailItem.prototype.setWatched = function(watched) {
  if (!this.unwatchedNode) {
    return;
  }
  this.unwatchedNode.hidden = watched;
};

ThumbnailItem.prototype.updatePoster = function(imageblob) {
  if (!this.posterNode) {
    return;
  }

  if (this.posterNode.dataset.uri) {
    URL.revokeObjectURL(this.posterNode.dataset.uri);
  }

  if (imageblob) {
    var imageUri = URL.createObjectURL(imageblob);
    this.posterNode.dataset.uri = imageUri;
    this.posterNode.style.backgroundImage = 'url(' + imageUri + ')';
  } else {
    this.posterNode.dataset.uri = '';
    this.posterNode.style.backgroundImage = '';
  }
};
