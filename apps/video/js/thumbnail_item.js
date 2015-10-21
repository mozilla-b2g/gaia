/* global MediaUtils,VideoUtils */
/**
 * ThumbnailItem is view object for a single video data. It renders video with
 * ThumbnailItem.view. ThumbnailItem keeps the referenced video data, while
 * dispatching tap event, it supplies the video data as the argument.
 * ThumbnailItem wraps the dom event to its owned addTapListener. When we need
 * to change the behavior to trigger tap, we may just change the implementation
 * layer here.
 *
 * If we need to mark a thumbnail as selected or context, we need to add/remove
 * the CSS classes of htmlNode property which is created within constructor.
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
 *   setWatched: set this thumbnail item as watched or not. args:
 *          watched: a boolean for watched or not.
 *   updatePoster: update the poster image. args:
 *          imageblob: a image blob object.
 *   updateTitleText: updates the title text according to the size of it.
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
 * Global Variables:
 *   titleMaxLines: the maximum lines of title field. The default value is 2.
 */
'use strict';

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
  this.titleNode = null;
  this.htmlNode = null;
  // array for hosting tap listeners.
  this.tapListeners = [];
  this.data = videoData;

  var _this = this;

  render();

  // the main function to render everything to UI.
  function render() {
    // render title
    var duration = '';
    if (isFinite(_this.data.metadata.duration)) {
      duration = MediaUtils.formatDuration(_this.data.metadata.duration);
    }
    // render type
    var videoType = '';
    if (_this.data.type) {
      var pos = _this.data.type.indexOf('/');
      videoType = (pos > -1 ? _this.data.type.slice(pos + 1) : _this.data.type);
    }

    // popular html text
    var domNode = ThumbnailItem.view({
      'title': _this.data.metadata.title,
      'durationText': duration,
      'typeText': videoType
    });

    if (!domNode) {
      throw new Error('the template does not contain any element');
    }

    _this.htmlNode = domNode;
    // This is the element that displays the image blob
    _this.posterNode = domNode.querySelector('.img');
    _this.detailNode = domNode.querySelector('.details');
    _this.titleNode = domNode.querySelector('.title');
    _this.unwatchedNode = domNode.querySelector('.unwatched');
    _this.sizeNode = domNode.querySelector('.size-text');

    // This  is the image blob we display for the video.
    // If the video is part-way played, we display the bookmark image.
    // Otherwise we display the poster image from metadata parsing.
    _this.updatePoster(_this.data.metadata.bookmark ||
                       _this.data.metadata.poster);

    _this.setWatched(_this.data.metadata.watched);

    if (_this.detailNode) {
      _this.detailNode.dataset.title = _this.data.metadata.title;
    }

    // add click event listeners.
    _this.htmlNode.addEventListener('click', dispatchClick);

    // Insert the video size with a localized version of "KB" or "MB".
    _this.localize();
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

ThumbnailItem.titleMaxLines = 2;

ThumbnailItem.view = function({title, durationText, typeText}) {
  // <li class="thumbnail" role="option">
  //   <div class="inner">
  //     <div class="unwatched"></div>
  //     <img class="img" role="presentation"></img>
  //     <div class="details">
  //       <span class="title">${title}</span>
  //       <span class="duration-text after line-break">${durationText}</span>
  //       <span class="size-type-group">
  //         <span class="size-text after"></span>
  //         <span class="type-text after">${typeText}</span>
  //       </span>
  //     </div>
  //   </div>
  // </li>
  var listItem = document.createElement('li');
  listItem.classList.add('thumbnail');
  listItem.setAttribute('role', 'option');

  var divInner = document.createElement('div');
  divInner.classList.add('inner');

  var divUnwatched = document.createElement('div');
  divUnwatched.classList.add('unwatched');

  var image = document.createElement('img');
  image.classList.add('img');
  image.setAttribute('role', 'presentation');

  var divDetails = document.createElement('div');
  divDetails.classList.add('details');

  var spanTitle = document.createElement('span');
  spanTitle.classList.add('title');
  spanTitle.textContent = title;

  var spanDuration = document.createElement('span');
  spanDuration.classList.add('duration-text');
  spanDuration.classList.add('after');
  spanDuration.classList.add('line-break');
  spanDuration.textContent = durationText;

  var spanSizeType = document.createElement('span');
  spanSizeType.classList.add('size-type-group');

  var spanSizeText = document.createElement('span');
  spanSizeText.classList.add('size-text');
  spanSizeText.classList.add('after');

  var spanTypeText = document.createElement('span');
  spanTypeText.classList.add('type-text');
  spanTypeText.classList.add('after');
  spanTypeText.textContent = typeText;

  spanSizeType.appendChild(spanSizeText);
  spanSizeType.appendChild(spanTypeText);

  divDetails.appendChild(spanTitle);
  divDetails.appendChild(spanDuration);
  divDetails.appendChild(spanSizeType);

  divInner.appendChild(divUnwatched);
  divInner.appendChild(image);
  divInner.appendChild(divDetails);

  listItem.appendChild(divInner);

  return listItem;
};

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
    this.posterNode.classList.remove('default');
    var imageUri = URL.createObjectURL(imageblob);
    this.posterNode.dataset.uri = imageUri;
    this.posterNode.src = imageUri;
  } else {
    this.posterNode.classList.add('default');
    this.posterNode.dataset.uri = '';
    this.posterNode.src = 'style/images/default_thumbnail.png';
  }
};

ThumbnailItem.prototype.updateTitleText = function() {
  this.titleNode.textContent = VideoUtils.getTruncated(this.data.metadata.title,
                                        {
                                          node: this.titleNode,
                                          maxLine: ThumbnailItem.titleMaxLines
                                        });
};

ThumbnailItem.prototype.localize = function() {
  if (this.sizeNode && isFinite(this.data.size)) {
    MediaUtils.getLocalizedSizeTokens(this.data.size).then((args) => {
      navigator.mozL10n.setAttributes(this.sizeNode, 'fileSize', args);
    });
  }
};
