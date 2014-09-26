define(function() {

/**
 * Convenience class and wrapper around building multiple fetching operations or
 * the aggregation of many fetching operations into a single unit of
 * operation...
 *
 *
 *    var fetcher = new $bodyfetcher.BodyFetcher(
 *      connection,
 *      BodyParser (or any other kind of parser),
 *      [
 *        { uid: X, partInfo: {}, bytes: [A, B] }
 *      ]
 *    );
 *
 *    // in all examples item is a single element in the
 *    // array (third argument).
 *
 *    fetcher.onerror = function(err, item) {};
 *    fetcher.ondata = function(parsed, item) {}
 *    fetcher.onend = function() {}
 *
 */
function BodyFetcher(connection, parserClass, list) {
  this.connection = connection;
  this.parserClass = parserClass;
  this.list = list;

  this.pending = list.length;

  this.onerror = null;
  this.ondata = null;
  this.onend = null;

  list.forEach(this._fetch, this);
}

BodyFetcher.prototype = {
  _fetch: function(request) {
    var self = this;

    this.connection.listMessages(
      request.uid,
      [
        'BODY.PEEK[' + (request.partInfo.partID || '1') + ']' +
          (request.bytes ?
           '<' + request.bytes[0] + '.' + request.bytes[1] + '>' :
           '')
      ],
      { byUid: true },
      function (err, messages) {
        if (err) {
          // if fetch provides an error we expect this request to be
          // completed so we resolve here...
          self._resolve(err, request);
        } else {
          var parser = new this.parserClass(request.partInfo);
          var msg = messages[0];
          var body = null;
          for (var key in msg) {
            if (/^body/.test(key)) {
              body = msg[key];
              break;
            }
          }

          if (!body) {
            self.resolve('no body', request);
          } else {
            parser.parse(body);
            self._resolve(null, request, parser.complete());
          }
        }
      }.bind(this));
  },

  _resolve: function() {
    var args = Array.slice(arguments);
    var err = args[0];

    if (err) {
      if (this.onerror) {
        this.onerror.apply(this, args);
      }
    } else {
      if (this.onparsed) {
        // get rid of the error object
        args.shift();

        this.onparsed.apply(this, args);
      }
    }

    if (!--this.pending && this.onend) {
      this.onend();
    }
  }
};

return {
  BodyFetcher: BodyFetcher
};

});
