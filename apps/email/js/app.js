/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const R_HTML_BODY = /<body([\s\S]*?)>([\s\S]*?)(<\/body>)/i,
  R_HTML_ELEMENT = /<html([\s\S]*?)>([\s\S]*?)(<\/html>)/i,
  R_HTML_DOCTYPE = /<!DOCTYPE([\s\S]*?)>/i,
  R_SCRIPT_EVENT = /<(\w+?)([\s]+?)([\s\S]*)?(on\w+?=(["']?)([\s\S]*?)(\5))([\s>$])/,
  R_HTML_TAGS = /<(\w+?)([\s\S]*?)>([\s\S]*?)(<\/\1>)/ig,
  R_HTML_SINGLE_TAGS = /<(\w+?)([\s\S]*?)>'/,
  REPLACE_TAGS = [
    'html',
    'body',
    'meta',
    'link',
    'script',
    'style',
    'object',
    'iframe',
    'embed',
    'param',
    'canvas'
  ];


var App = function() {

};

App.Folder = function CreateFolder({name}) {
  this.name = name;

  this.map = new Map();
  this.domList = document.createElement('section');

  domList.className = 'messages-list';
};

App.Folder.prototype = {
  unread: 0
};

App.sanitizeHTML = function HTMLSantization(html) {
  html = html
    // First what we needs is that need select only body of document
    .replace(R_HTML_ELEMENT, '$2')
    .replace(R_HTML_BODY, '$2')
    //Replace defined document type
    .replace(R_HTML_DOCTYPE, '')
    // Replace valid tags
    .replace(new RegExp('<(' + REPLACE_TAGS.join('|') + ')([\\s\\S]*?)>([\\s\\S]*?)(\\/\\1>)', 'ig'), '')
    // Replace invalid tags
    .replace(new RegExp('<(' + REPLACE_TAGS.join('|') + ')([\\s\\S]*?)>', 'ig'), '')
    .replace(R_SCRIPT_EVENT, function(input, tag, t1, t2, r1, r2, r3, r4, t3) {
      return '<' + tag + t1 + t2 + t3
    });

  return html;

};

App.escapeHTML = function HTMLEscaping(html) {
  var node = document.createElement('escape');

  node.textContent = html;

  return node.innerHTML;
};

App.cleanTags = function TagsCleaning(html) {
  return html.replace(R_HTML_TAGS, '$3')
    .replace(R_HTML_SINGLE_TAGS);
};