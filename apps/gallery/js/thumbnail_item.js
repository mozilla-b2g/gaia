/**
 * ThumbnailItem is view object for a single gallery item data. It renders file
 * in listitem object.
 *
 * CONSTRUCTOR:
 *   To create a ThumbnailItem objet requires the following argument:
 *      fileData: the file data object from mediadb.
 *
 * Properties:
 *   htmlNode: the HTML DOM node for this thumbnail item. It is rendered at the
 *             creation of object.
 *   data: the file data object bound with this thumbnail item.
 */
function ThumbnailItem(fileData) {
  if (!fileData) {
    throw new Error('fileData should not be null or undefined.');
  }
  this.data = fileData;

  this.htmlNode = document.createElement('li');
  this.htmlNode.classList.add('thumbnail');
  this.htmlNode.dataset.filename = fileData.name;

  // We revoke this url in imageDeleted
  var url = URL.createObjectURL(fileData.metadata.thumbnail);
  // We set the url on a data attribute and let the onscreen
  // and offscreen callbacks below set and unset the actual
  // background image style. This means that we don't keep
  // images decoded if we don't need them.
  this.htmlNode.dataset.backgroundImage = 'url("' + url + '")';
}
