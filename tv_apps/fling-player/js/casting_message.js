(function(exports) {
  'use strict';

  /**
   * This object parses and process the message casted
   * between receiver and controller.
   *
   * The message casted is in JSON and shall carry properties below:
   * - seq: Number. The sequence of message sent. Increased by 1 when sending
   *        one new message. The message sequences from controller and receiver
   *        shall be independent to each other.
   * - type: String. Indicate the message type.
   * - other extra properties depending on the type
   */
  var castingMessage = {};

  castingMessage.type = Object.freeze({
    /**
     * Represent acknowledgement of message receiving.
     * The extra message properties:
     *   - error: String. Present if there is error
     */
    ack : {
      name : 'ack',
      sanitizeMsg : function (msg) {

        if (msg.error !== null &&
            msg.error !== undefined &&
            typeof msg.error != 'string'
        ) {
          throw new Error('Ilegal error = ' + msg.error +
            ' in casting message of type = ' + this.name);
        }
        return msg;
      }
    },

    /**
     * Represent video playing status. The extra message properties:
     *   - time: Number. The current video time
     *   - status: String. Describe status, could be
     *     - buffering: Video buffering
     *     - loaded: The media's metadata has finished loading;
     *               all attributes now contain as much useful information
     *               as they're going to.
     *     - buffered: Video buffered and ready to play
     *     - playing: Video is playing
     *     - seeked: Video seeking is done
     *     - stopped: Video is not playing (maybe ended or paused).
     *     - error: Error on playing.
     *              When error occurs, one more extra message properties:
     *              - error: String. The error code.
     */
    status : {
      name : 'status',
      sanitizeMsg : function (msg) {

        if (typeof msg.time != 'number' || (msg.time >= 0) === false) {
          throw new Error('Ilegal time = ' + msg.time +
            ' in casting message of type = ' + this.name);
        }

        var validStatus = [
          'buffering', 'loaded', 'buffered',
          'playing', 'seeked', 'stopped', 'error'
        ];
        if (validStatus.indexOf(msg.status) < 0) {
          throw new Error('Ilegal status = ' + msg.status +
            ' in casting message of type = ' + this.name);
        }

        if (msg.status == 'error' && typeof msg.error != 'string') {
          throw new Error('Ilegal error = ' + msg.error +
            ' in casting message of type = ' + this.name);
        }

        return msg;
      }
    },

    /**
     * Request to load and play video. The extra message properties:
     *   - url : String. The video url.
     */
    load : {
      name : 'load',
      sanitizeMsg : function (msg) {
        if (typeof msg.url != 'string' || !msg.url) {
          throw new Error('Ilegal url = ' + msg.url +
            ' in casting message of type = ' + this.name);
        }
        return msg;
      }
    },

    /**
     * Request to play video
     */
    play : {
      name : 'play'
    },

    /**
     * Request to pause video
     */
    pause : {
      name : 'pause'
    },

    /**
     * Request to seek on video. The extra message properties:
     *   - time: Number. The time to seek.
     */
    seek : {
      name : 'seek',
      sanitizeMsg : function (msg) {
        if (typeof msg.time != 'number' || (msg.time >= 0) === false) {
          throw new Error('Ilegal time in casting message of type = ' +
            this.name, msg.time);
        }
        return msg;
      }
    }
  });

  /**
   * Validate and make sure the message format, datatype.
   *
   * @param {Object} content the message content to sanitize
   * @return {Object} Sanitized message
   */
  castingMessage.sanitizeMsg = function (content) {

    console.log('castingMessage#sanitizeMsg');

    console.log('Sanitize message content:', content);

    if (this.type[content.type]) {

      if (typeof content.seq == 'number' && content.seq >= 0) {

        if (typeof this.type[content.type].sanitizeMsg == 'function') {
          content = this.type[content.type].sanitizeMsg(content);
        }

      } else {
        throw new Error('Missing sequence of casting message : ' +
          JSON.stringify(content));
      }

    } else {
      throw new Error('Unknown type of casting message : ' + content.type);
    }
    return content;
  };

  /**
   * @param {String} txt the message txt sent from controller
   * @return {Array.<Object>} the parsed messages
   */
  castingMessage.parse = function (txt) {

    console.log('castingMessage#parse');

    console.log('Parsing : ', txt);

    var data = '[' + txt.replace('}{', '},{') + ']';
    var msgs = JSON.parse(data);

    console.log('Parsed : ', msgs);

    return msgs.map(m => this.sanitizeMsg(m));
  };

  /**
   * @param {Object} content the message content being sent.
   * @return {String} the messsage txt to sent
   */
  castingMessage.stringify = function (content) {
    this.sanitizeMsg(content);
    return JSON.stringify(content);
  };

  exports.castingMessage = castingMessage;
})(window);