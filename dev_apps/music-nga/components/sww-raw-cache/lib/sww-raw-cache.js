/* global Response, Request, Promise */
'use strict';

/**
 * Constructor for the RawCache object. It receives an object
 * with the configuration parameters.
 * @param {Object} options set of configuration parameters.
 */
function RawCache(options) {
  if (!options.cacheName) {
    throw Error('This middleware needs a cache name.');
  }

  this.cacheName = options.cacheName;
  this.DEFAULT_CONTENT_TYPE = options.defaultContentType || 'text/html';
}

/**
 * Utility method to retrieve cache used by this middleware.
 * @returns {Promise} promise once resolved will contain the Cache object
 */
RawCache.prototype._getCache = function getCache() {
  this._cache = this._cache || self.caches.open(this.cacheName);
  return this._cache;
};

// This middleware will support the following http methods
RawCache.prototype.SUPPORTED_ACTIONS = ['get', 'post', 'put', 'delete'];

/**
 * Handles the request and perform actions over the cache content
 * based on the http verb used for the request.
 * @param {Request} the request object.
 * @param {Response} the response object.
 * @param {Function} the callback to finalize the fetching pipeline.
 */
RawCache.prototype.onFetch = function onFetch(request, response, endWith) {
  if (response) {
    return Promise.resolve(response);
  }

  var method = request.method.toLowerCase();
  if (this.SUPPORTED_ACTIONS.indexOf(method) === -1) {
    // Method not supported, just bypass the request and do nothing
    // in this layer
    return null;
  }

  return this[method].apply(this, [request, response, endWith]);
};

/**
 * Get the content from this cache.
 * @param {Request} request the request object.
 * @param {Response} response the response object.
 * @returns {Promise} Promise with the response object cached or null
 */
RawCache.prototype.get = function get(request, response, endWith) {
  var _this = this;
  return _this._getCache().then(function(cache) {
    return cache.match(request).then(function (response) {
      if (!response) { return null; }
      return endWith(response);
    });
  });
};

/**
 * Removes the specified uri from the cache entry
 * @param {Request} request the request object.
 * @param {Response} response the response object.
 * @returns {Promise} Promise, result of removing from cache.
 */
RawCache.prototype.delete = function del(request) {
  var _this = this;
  return this._getCache().then(function(cache) {
    return cache.delete(request).then(
      _this._getOKResponse,
      _this._getErrorResponse
    );
  });
};

/**
 * Adds the body of the specified request as a cache entry for the uri
 * in the request.
 * @param {Request} request the request object.
 * @param {Response} response the response object.
 * @returns {Promise} Promise, 200 response if cached correctly.
 */
RawCache.prototype.post = function post(request) {
  var _this = this;
  request = request.clone();
  return request.text().then(function(content) {
    var contentType =
      request.headers.get('Content-Type') || _this.DEFAULT_CONTENT_TYPE;
    var response = new Response(content, {
      'headers': {
      	'x-sww-raw-cache': _this.cacheName + ';time=' + Date.now(),
      	'Content-Type': contentType
      }
    });
    // We create a new request, with default GET method
    var customRequest = new Request(request.url);
    return _this._getCache().then(function(cache) {
      return cache.put(customRequest, response).then(
        _this._getOKResponse,
        _this._getErrorResponse
      );
    });
  });
};

// In this version put and post work in the same way, this could change
// in future versions.
RawCache.prototype.put = RawCache.prototype.post;

/**
 * Builds a 200 response to be returned when operations against the cache
 * are performed without problems.
 * @param (string) msg optional message
 * @returns (Response) response object
 */
RawCache.prototype._getOKResponse = function(msg) {
  return RawCache._getResponse(200, {
    'status': 'ok',
    'msg': msg
  });
};

/**
 * Builds a 500 response to be returned when operations against the cache
 * are performed with problems.
 * @param (string) msg optional message
 * @returns (Response) response object
 */
RawCache.prototype._getErrorResponse = function(msg) {
  return RawCache._getResponse(500, {
    'status': 'ko',
    'msg': msg
  });
};

/**
 * Builds a generic response.
 */
RawCache._getResponse = function(statusNumber, content) {
  return new Response(JSON.stringify(content), {
    'headers': { 'Content-Type': 'application/json' },
    'status': statusNumber
  });
};

module.exports = RawCache;
