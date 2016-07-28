# Fast List
[![](https://travis-ci.org/gaia-components/fast-list.svg)](https://travis-ci.org/gaia-components/fast-list)

The FastList is a virtual-list implementation based on the DomScheduler.
It currently lives in `fast-list.js`.

The content of the list comes from a `DataSource` that needs to implement the API described
below. When the content is edited from the list "Edit mode", the list will trigger calls to the source itself.

But there's no observation going on, so if the content changes for other reasons the list needs to be made aware of that.

## List API
### Constructor

```js
new FastList(container, source);
```

#### Container

Here's a container example

```html
    <section>
      <ul>
        <li
          ><h3> </h3
          ><p> </p
          ><div class="overlay"
            ><div class="cursor">↕︎</div></div
          ></li>
      </ul>
    </section>
```
It should contain:
* A `ul` element where the list will be rendered, the `height` of this element will be set to the full height of the list so the container should `overflow: scroll`
* A `template`, which is the DOM node that will be duplicated for every item in the list.

For performance reasons it's important to be mindful of useless `TextNodes` that might be created as part of the template, hence the weird line returns.

### Edit mode
```js
list.toggleEditMode()
```
This method returns a promise, fulfilled once the transition is done.

### Notifying of new content insertion
```js
list.insertedAtIndex(0);
```
To insert with a nice transition.

```js
list.reloadData()
```
For bigger, instantaneous changes.

### Scrolling
```js
list.scrollTop
```
Will give you the *cached* scroll top position (not causing a reflow).

```js
list.scrollInstantly(by)
```
Will do as it says.

```js
list.updateListHeight()
```
Can be called if the number of items in the list has changed, it'll return a scheduler promise fulfilled after the mutation is executed. This will also cause the scrollbar to flash.

## Data Source API
### Filling up the list items
```js
populateItem: function(item, i)
```
* `item` is a DOM node formatted like the template
* `i` is the index of the record

#### What if the content is not ready? (async fetch...)
When the content is not ready, `populateItem` should return a `Promise` resolved once the content has been fetched by the DataSource.
The list will toggle a `populated` dataset on the item to style the "empty" cell, and call `populateItem` again once the promise resolves if the item is still in the viewport.

This should enable the data source to work with a shallow array of content with the correct size, then populate/cleanup the array as the list is scrolled.
eg.
* Loading 250 items at first
* Them loading 250 more once it was asked to populate item 125
* and so on...

TBD: we might want to give the data source more information about the viewport window.

### Working with sections / headers
```
getSections: function()
```
Returns an array of the section names (keys).
_Should return only 1 section if you don't want to use headers._

```
sectionHeaderHeight: function()
```
Returns the height in pixel of a header title.
_Should return 0 if you don't want to use headers._

```
fullSectionHeight: function(key)
```
Returns the height in pixel of the _content_ of the sections.

```
fullSectionLength: function(key)
```
Returns the number of items in the section.

```
getSectionFor: function(index)
```
Returns the section name for the item at index `index`.

### Accessing raw content
```
getRecortAd: function(i)
```
Returns the raw data for this item.

### Geometry
```js
indexAtPosition: function(pos)
```
Should return the record index that needs to be displayed at the `pos` position.

```js
positionForIndex: function()
```
The oposite :)

```js
fullLength: function()
```
The total number of items in the list.

```js
itemHeight: function()
```
The height of an item in the list, in pixels. Should match the height of the template.

```js
fullHeight: function()
```
The total height of the list in pixels.

### Edition support
```js
insertAtIndex: function(index, record, sectionHint)
```
_The sectionHint is only needed when inserting at the very beginning or end of a section._


```
replaceAtIndex: function(index, record)

removeAtIndex: function(index)
```

