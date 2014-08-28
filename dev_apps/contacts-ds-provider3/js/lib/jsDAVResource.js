/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

'use strict';

jsDAVlib.DAVResource = function jsDAVResource(XMLDocument) {
  if (XMLDocument) {
    this.xml = XMLDocument;
    this.data = jsDAVlib.xmlParser.parse(XMLDocument);
  } else {
    // If no XMLDocument is provided a new and clean resource is created
    // TO-DO: Allow collection & file creation and store changes in server
    this.xml = null;
    this.data = {
      valid: true,
      items: [{
        href: "",
        size: -1,
        mime: "",
        resourceType: {
          type: "file"
        }
      }]
    }
  }
  this.parent = null;
}

jsDAVlib.DAVResource.prototype = {
  addFileContents: function addFileContents(data) {
    this.contents = data;
  },
  isFile: function isFile() {
    if (!this.data.valid)
      return false;
    return this.data.items[0].resourceType.type === 'file';
  },
  isCollection: function isCollection() {
    if (!this.data.valid)
      return false;
    return this.data.items[0].resourceType.type === 'dir';
  },
  isAddressBook: function isAddressBook() {
    if (!this.data.valid)
      return false;
    return this.data.items[0].resourceType.addressbook === true;
  },
  isCalendar: function isCalendar() {
    if (!this.data.valid)
      return false;
    return this.data.items[0].resourceType.calendar === true;
  },
  isException: function isException() {
    if (!this.data.valid)
      return 'Received data is not valid';
    return false;
  },
  getExceptionInfo: function getExceptionInfo() {
    // TO-DO
  },

  getMetadata: function getMetadata() {
    return {
      href: this.data.items[0].href,
      mime: this.data.items[0].mime,
      size: this.data.items[0].size,
      type: this.data.items[0].resourceType
    }
  },

  getContents: function getContents() {
    if (this.isFile && this.contents) {
      return this.contents;
    } else if (this.isCollection) {
      var list = [];
      for (var i=1; i<this.data.items.length; i++) {
        list.push({
          href: this.data.items[i].href,
          mime: this.data.items[i].mime,
          size: this.data.items[i].size,
          lastModified: this.data.items[i].lastModified,
          type: this.data.items[i].resourceType.type
        });
      }
      return list;
    } else {
      return null;
    }
  },

  setParent: function setParent(parent) {
    this.parent = parent;
  },
  parent: function getParent() {
    return this.parent;
  },

  // Collection resource responds with an array of all his elements
  // File resource responds with the file contents
  get: function get() {
    return {
      meta: this.getMetadata(),
      data: this.getContents()
    };
  }
};
