(function(exports) {
'use strict';

var TutorialUtils = {
  /**
   * Helper function to load images and video
   * @param {DOMNode} mediaElement  video or image to assign new src to
   * @param {String} src  URL for video/image resource
   * @returns {Promise}
   */
  loadMedia: function (mediaElement, src) {
    console.log('loadMedia, got mediaElement: ', mediaElement);
    var isVideo = (mediaElement.nodeName === 'VIDEO');
    console.log('TutorialUtils.loadMedia, isVideo: ',
                isVideo, mediaElement.nodeName);
    return new Promise(function(resolve, reject) {
      function onMediaLoadOrError(evt) {
        console.log('TutorialUtils.loadMedia, onMediaLoadOrError for ' +
                    'evt.type: ' + (evt && evt.type));
        evt.target.removeEventListener('error', onMediaLoadOrError);
        if (isVideo) {
          evt.target.removeEventListener('canplay', onMediaLoadOrError);
          evt.target.removeEventListener('abort', onMediaLoadOrError);
        } else {
          evt.target.removeEventListener('load', onMediaLoadOrError);
        }
        // Dont block progress on failure to load media
        if (evt.type === 'error') {
          console.error('Failed to load tutorial media: ' + src);
        } else if (evt.type === 'abort') {
          console.error('Loading of tutorial media aborted: ' + src);
        }
        resolve(evt);
      }
      function onVideoUnloaded(evt) {
        console.log('TutorialUtils.loadMedia, onVideoUnloaded for evt.type: ' +
          (evt && evt.type));
        mediaElement.removeEventListener('emptied', onVideoUnloaded);
        mediaElement.addEventListener('canplay', onMediaLoadOrError);
        mediaElement.addEventListener('abort', onMediaLoadOrError);
        mediaElement.addEventListener('error', onMediaLoadOrError);
        console.log('TutorialUtils.loadMedia, onVideoUnloaded, ' +
                    'assigning src: ' + src);
        mediaElement.src = src;
        mediaElement.load();
      }
      if (isVideo) {
        // must unload video and force load before switching to new source
        if (mediaElement.src) {
          console.log('TutorialUtils.loadMedia, removing src attribute');
          mediaElement.removeAttribute('src');
          mediaElement.addEventListener('emptied', onVideoUnloaded, false);
          console.log('TutorialUtils.loadMedia, calling load');
          mediaElement.load();
        } else {
          console.log('TutorialUtils.loadMedia, no src, ' +
            'just calling onVideoUnloaded');
          onVideoUnloaded();
        }
      } else {
        console.log('TutorialUtils.loadMedia, not a video, ' +
          'listen for load/error only');
        mediaElement.addEventListener('load', onMediaLoadOrError, false);
        mediaElement.addEventListener('error', onMediaLoadOrError, false);
        mediaElement.src = src;
      }
    });
  },

  /**
   * Convenience to load and then play video
   * @param {DOMNode} mediaElement  video or image to assign new src to
   * @param {String} src  URL for video/image resource
   * @returns {Promise}
   */
  loadAndPlayMedia: function(mediaElement, src) {
    return this.loadMedia(mediaElement, src).then((evt) => {
      if (evt.type !== 'error' && mediaElement.nodeName === 'VIDEO') {
        mediaElement.play();
      }
    });
  },

  /**
   * Helper to check (via HEAD request) a given resource exists
   * The returned promise resolves with a true|false value
   *
   * @param {String} src  URL for video/image resource
   * @returns {Promise}
   */
  fileExists: function (src) {
    return new Promise((resolve) => {
      window.fetch(src, { method: 'HEAD' }).then((response) => {
        resolve(response.ok);
      }).catch(() => {
        resolve(false);
      });
    });
  },

  /**
   * Helper to get best-match resource url for the current document.dir
   * @param {String} src  URL for video/image resource
   * @returns {Promise}
   */
 getBestAssetForDirection: function(src) {
    var dir = document.dir || 'ltr';
    var re =
      /(-rtl|ltr)?\.(png|gif|jpg|webm|mp4|m4v|ogg|ogv)$/;
    var directionSrc = src.replace(re, '-'+dir+'.$2');
    return this.fileExists(directionSrc).then((result) => {
      return result ? directionSrc : src;
    }).catch((e) => {
      console.log('Exception from getBestAssetForDirection: ', e);
    });
  },

  /**
   * Private helper class to manage a series of sync or async functions
   *
   * The array may be manipulated using standard array methods while the
   * sequence runs. The sequence completes when there are no more functions or
   * an exception is raised.
   * At the end of the sequence, any 'oncomplete' assigned will be called with
   * the return value from the last function
   * Functions may return a 'thenable' to indicate async return
   * Exceptions will be passed into the oncomplete function
   * A Sequence may be cleanly aborted by calling abort() - no callbacks will
   * be fired
   * @class Sequence
   */
  Sequence: function() {
    var sequence = Array.slice(arguments);
    var aborted = false;
    sequence.abort = function() {
      aborted = true;
      this.length = 0;
      if (typeof this.onabort === 'function') {
        this.onabort();
      }
    };
    sequence.complete = function(result) {
      if(!aborted && typeof this.oncomplete === 'function') {
        this.oncomplete(result);
      }
    };
    sequence.fail = function(reason) {
      this.complete(reason);
    };
    sequence.next = function(previousTaskResult) {
      var result, exception;
      if (aborted) {
        return;
      }
      var task = this.shift();
      if (task) {
        try {
          result = task.apply(null, arguments);
        } catch(e) {
          exception = e;
        }
        if (exception) {
          this.fail(exception);
        } else if (result && typeof result.then === 'function') {
          result.then(this.next.bind(this), this.fail.bind(this));
        } else {
          this.next(result);
        }
      } else {
        this.complete(previousTaskResult);
      }
    };
    return sequence;
  }
};

exports.TutorialUtils = TutorialUtils;

})(window);
