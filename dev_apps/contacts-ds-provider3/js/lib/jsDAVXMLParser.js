/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

jsDAVlib.xmlParser = (function jsDAVXMLParser() {
  var XMLNS_DAV = 'DAV:',
      XMLNS_CardDAV = 'urn:ietf:params:xml:ns:carddav',
      XMLNS_CalDAV = 'urn:ietf:params:xml:ns:caldav';

  function parseDocument(XMLDocument) {
    var doc = {
      valid: false,
      items: []
    };

    function _getDAV_EBTN(node, tag) {
      try {
        return node.getElementsByTagNameNS(XMLNS_DAV, tag);
      } catch (e) {
        jsDAVlib.debug('Error looking for tag: ' + tag);
        return null;
      }
    }
    function _getDAV_EBTN_FirstContent(node, tag) {
      var item = _getDAV_EBTN(node, tag);
      if (item && item.length > 0) {
        return item[0].textContent;
      }
      return null;
    }
    function isCollection(node) {
      return node.getElementsByTagNameNS(XMLNS_DAV, 'collection').length > 0;
    }
    function getResourceType(node) {
      var resourceType = _getDAV_EBTN(node, 'resourcetype');
      if (resourceType) {
        var resType = {};
        if (node.getElementsByTagNameNS(XMLNS_DAV, 'collection').length > 0) {
          resType.type = 'dir';
        } else {
          resType.type = 'file';
        }
        if (node.getElementsByTagNameNS(
          XMLNS_CardDAV, 'addressbook').length > 0) resType.addressbook = true;
        if (node.getElementsByTagNameNS(
          XMLNS_CalDAV, 'calendar').length > 0) resType.calendar = true;
        return resType;
      }
      return null;
    }

    function _getItemData(node) {
      var props = _getDAV_EBTN(node, 'prop')[0];
      if (!props) {
        doc.valid = false;
        return null;
      }
      var itemData = {
        href: _getDAV_EBTN_FirstContent(node, 'href'),
        lastModified: _getDAV_EBTN_FirstContent(props, 'getlastmodified'),
        size: _getDAV_EBTN_FirstContent(props, 'getcontentlength'),
        mime: _getDAV_EBTN_FirstContent(props, 'getcontenttype')
      };

      itemData.resourceType = getResourceType(props);

      return itemData;
    }

    var allItems = _getDAV_EBTN(XMLDocument, 'response');
    if (!allItems) {
      doc.valid = false;
      return doc;
    }

    // Get all collection elements
    doc.items.allItems = [];
    for (var i=0; i<allItems.length; i++) {
      doc.items.push(_getItemData(allItems[i]));
    }

    if (doc.items.length === 0) {
      doc.valid = false;
    } else {
      doc.valid = true;
    }
    return doc;
  }

  return {
    parse: function parse(XMLDocument) {
      return parseDocument(XMLDocument);
    },
    getQueryXML: function getQueryXML() {
      return '<?xml version="1.0"?>\n' +
        '<D:propfind xmlns:D="' + XMLNS_DAV + '"><D:prop>' +
        '<D:getlastmodified/>' +
        '<D:getcontentlength/>' +
        '<D:getcontenttype/>' +
        '<D:resourcetype/>' +
        '</D:prop></D:propfind>';
    }
  }
})();
