# Metadata Parser

This directory contains the metadata parser for the Gaia Music app. It supports
parsing ID3v1, ID3v2, MP4, and Vorbis Comments (Ogg Vorbis, Opus, and FLAC).

## Basic Usage

In order to use the metadata parser, you need to include three JS files:
`core.js`, `formats.js`, and `/shared/js/blobview.js` (these all get
concatenated together in the Music build process). You'll also need the
`LazyLoader`, located at `/shared/js/lazy_loader.js`. These core files will
load all the other relevant files as necessary.

To parse metadata, there's a single function to call from `core.js`:
`AudioMetadata.parse()`. This takes a `Blob` and returns a `Promise` with the
metadata from the audio file. The metadata contains the following fields
(fields in square brackets are optional):

 * `tag_format` (*`String`*) The format of the tag (e.g. `'id3v2.4'`).
 * `artist` (*`String`*) artist The track's artist.
 * `album` (*`String`*) album The track's album.
 * `title` (*`String`*) title The track's title.
 * `[tracknum]` (*`Number`*) The number of the track on the album.
 * `[trackcount]` (*`Number`*) The total number of tracks in the album.
 * `[discnum]` (*`Number`*) The number of the disc on the album.
 * `[disccount]` (*`Number`*) The total number of discs in the album.
 * `[picture]` (*`Picture`*) The cover art, if any.
 * `rated` (*`Number`*) The track's rating; starts at 0.
 * `played` (*`Number`*) The track's play count; starts at 0.

## Album Art

Album art is handled separately from the rest of metadata parsing. Once
`AudioMetadata.parse()` resolves, any album art embedded in the audio file will
be stored in the metadata object. This art can come in one of two flavors:
*embedded* or *unsynced*. Embedded album art is just a raw image file stored at
a particular byte range of the audio file; unsynced album art is encoded in some
way.

To finish processing the album art, call `AlbumArt.process()` (from
`album_art.js`) with the `Blob` and the metadata object retrieved from
`AudioMetadata.parse()`. This function does two things: first, it saves a copy
of any *unsynced* album art to the filesystem for easy retrieval; second, for
any track with no album art, it searches the track's directory for external art
files (valid filenames are `'folder.jpg'`, `'cover.jpg'`, or `'front.jpg'`).

Once the `Promise` for this function resolves, the `picture` field of the
metadata object will be filled in with the following fields (assuming there
was any album art to fetch):

 * `flavor` (*`String`*) How the art was stored; one of `'embedded'`,
   `'unsynced'`, or `'external'`.
 * `[start]` (*`Number`*) The offset in bytes to where the picture is stored in
   the audio file; only applies when `flavor` is `'embedded'`.
 * `[end]` (*`Number`*) The offset in bytes to the end of where the picture is
   stored in the audio file; only applies when `flavor` is `'embedded'`.
 * `[type]` (*`Number`*) The mimetype of the picture; only applies when
   `flavor` is `'embedded'`.
 * `[filename]` (*`String`*) The path on the filesystem to the original
   (full-size) picture; only applies when `flavor` is `'external'` or
   `'unsynced'`.

### Album Art Cache

Though not strictly a part of the metadata parser, this directory also contains
`album_art_cache.js`. This file is responsible for fetching thumbnails (and
fill-size versions) of album art for display in the Music app's UI. This file
has four functions (as static methods of `AlbumArtCache`): `getFullSizeURL()`,
`getFullSizeBlob()`, `getThumbnailURL()`, and `getThumbnailBlob()`.

Each of these functions takes a `fileinfo` object (containing the file's `Blob`
and its metadata) and a Boolean indicating if the function should skip fetching
placeholder art. As the names imply, these return `Promise`s that resolve to
URLs or `Blob`s of the full-size (or thumbnail-size) album covers.

## Internals

The metadata parser is designed to make it easy to add new metadata formats with
minimal plumbing. As a result, each metadata format is contained in its own JS
file, which is referenced from `formats.js`. `formats.js` has a single function,
`MetadataFormats.findParser`, which takes a `BlobView`, examines the magic bytes
at the beginning, and returns an object with a `parse()` method that can be
used to lazy-load and call the particular format's parser.
