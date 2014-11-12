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
 *    fetcher.onparsed = function(parsed, item) {}
 *    fetcher.onend = function(err) {}
 *
 */
function BodyFetcher(connection, parserClass, list) {
  this.connection = connection;
  this.parserClass = parserClass;
  this.list = list;

  this.pending = list.length;

  this.onparsed = null;
  this.onend = null;

  list.forEach(this._fetch, this);
}

BodyFetcher.prototype = {
  _fetch: function(request) {
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
          this._resolve(err, request, null);
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
            this.resolve('no body', request);
          } else {
            parser.parse(body);
            this._resolve(null, request, parser.complete());
          }
        }
      }.bind(this));
  },

  _resolve: function(err, req, result) {
    if (this.onparsed) {
      this.onparsed(err, req, result);
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
