/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 /* HTML files to be loaded should be enclosed by a <template> element.
  *   <template>
  *     put HTML content here
  *   </template>
  */

'use strict';

(function (exports) {

  /**
   * ResourceLoader is a stand-alone module which provides methods for lazy
   * loading HTML, CSS and javascript resources.
   *
   * TODO: Methods for lazy loading javascript files.
   *
   * @param {object} options [description]
   */
  function ResourceLoader(options) {
    this.path = '';

    this.init(options);
  }

  ResourceLoader.prototype = {

    constructor: ResourceLoader,

    init(options) {
      options = options || {};

      this.path = options.path || 'elements';
    },

    /**
     * Load HTML and CSS by name.
     * @param  {string} name [description]
     * @return {Promise}     The returned Promise is resolved with a Node.
     */
    loadByName(name) {
      var path = [this.path, name].join('/');
      this.loadCss(path);
      return this.loadHtml(path);
    },

    /**
     * Load an HTML file from the specified path, the resulted DOM Node can be
     * directly appended or modified with DOM API.
     * @param  {string} path The path of the HTML file, with or without
     *                       html extension.
     * @return {Promise}     The returned Promise is resolved with a DOM Node.
     */
    loadHtml(path) {
      if (!path.endsWith('.html')) {
        path = [path, 'html'].join('.');
      }

      return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
          var template = xhr.responseXML.querySelector('template');
          var node = document.importNode(template.content, true);
          resolve(node);
        };
        xhr.open('GET', path);
        xhr.responseType = 'document';
        xhr.overrideMimeType('text/html');
        xhr.send();
      });
    },


    /**
     * Load an CSS file from the specified path.
     * @param  {string} path The path of the CSS file, with or without
     *                       css extension.
     * @return {Promise}
     */
    loadCss(path) {
      if (!path.endsWith('.css')) {
        path = [path, 'css'].join('.');
      }

      if (document.querySelector('link[rel=stylesheet][href="' + path + '"]')) {
        return;
      }

      return new Promise((resolve, reject) => {
        var link = document.createElement('link');
        link.type = 'text/css';
        link.rel = 'stylesheet';
        link.href = path;
        link.addEventListener('load', () => {
          resolve();
        });
        document.head.appendChild(link);
      });
    },

    /**
     * Unload a loaded template. We don't cache HTML templates, so we only need
     * to remove the loaded link element from document.head.
     * @param  {string} name The name of the template.
     */
    unloadByName(name) {
      var path = [this.path, name].join('/');
      this.unloadCss(path);
    },

    /**
     * Remove a CSS link element from document.head.
     * @param  {string} path The path of the CSS file, with or without
     *                       css extension.
     */
    unloadCss(path) {
      if (!path.endsWith('.css')) {
        path = [path, 'css'].join('.');
      }

      var link =
        document.querySelector('link[rel=stylesheet][href="' + path + '"]');

      if (link) {
        document.head.removeChild(link);
      }
    }

  };

  exports.ResourceLoader = new ResourceLoader();

})(window);
