(function(exports) {
  'use strict';

  var castingMsgTemplate = {
    get : function () {
      return {
        ack : {
          type : 'ack',
          seq : 1
        },
        statusBuffering : {
          type : 'status',
          seq : 1,
          time : 168,
          status : 'buffering'
        },
        statusLoaded : {
          type : 'status',
          seq : 1,
          time : 168,
          status : 'loaded'
        },
        statusBuffered : {
          type : 'status',
          seq : 1,
          time : 168,
          status : 'buffered'
        },
        statusPlaying : {
          type : 'status',
          seq : 1,
          time : 168,
          status : 'playing'
        },
        statusSeeked : {
          type : 'status',
          seq : 1,
          time : 168,
          status : 'seeked'
        },
        statusStopped : {
          type : 'status',
          seq : 1,
          time : 168,
          status : 'stopped'
        },
        statusError : {
          type : 'status',
          seq : 1,
          time : 168,
          status : 'error',
          error : '404'
        },
        load : {
          type : 'load',
          seq : 1,
          url : 'http://foo.com/bar.ogg'
        },
        play : {
          type : 'play',
          seq : 1
        },
        pause : {
          type : 'pause',
          seq : 1
        },
        seek : {
          type : 'seek',
          seq : 1,
          time : 168
        }
      };
    }
  };

  exports.castingMsgTemplate = castingMsgTemplate;

})(window);
