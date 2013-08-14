# -*- coding: utf-8 -*-

from array import array
from optparse import OptionParser 
from xml.dom.minidom import parseString
from io import BytesIO
from StringIO import StringIO
from collections import defaultdict
import sys, struct, operator, heapq

# We use a trie to represent the dictionary. The first characters of every word
# are encoded into the trie (prefix). All words starting with that prefix are
# stored as a linear list in the leaf node of the trie (suffix). It might make
# sense to play with this number depending on the language since some languages
#  have longer average word lengths. For now we use a constant prefix length.
PrefixLimit = 10

# To increase lookup speed, we only store a specific number of words in every
# node and prune the rest.
MaxWordsPerNode = 3

# Mapping table for diacritics to the corresponding plain letter. The hash for
# the bloom filter is calculated by converting the word to lower-case plain
# letters. The trie in contrast encodes the actual word with proper upper/lower
# casing and the full character set. The lookup code has to use the same
# table to find all matching words the bloom filter indicated exist, so we
# encode this table in each dictionary file.
diacritics = {
    'a': u'ÁáĂăǍǎÂâÄäȦȧẠạȀȁÀàẢảȂȃĀāĄąÅåḀḁȺⱥÃãǼǽǢǣÆæ',
    'b': u'ḂḃḄḅƁɓḆḇɃƀƂƃ',
    'c': u'ĆćČčÇçĈĉĊċƇƈȻȼ',
    'd': u'ĎďḐḑḒḓḊḋḌḍƊɗḎḏĐđƋƌð',
    'e': u'ÉéĔĕĚěȨȩÊêḘḙËëĖėẸẹȄȅÈèẺẻȆȇĒēĘę',
    'f': u'ḞḟƑƒ',
    'g': u'ǴǵĞğǦǧĢģĜĝĠġƓɠḠḡǤǥ',
    'h': u'ḪḫȞȟḨḩĤĥⱧⱨḦḧḢḣḤḥĦħ',
    'i': u'ÍíĬĭǏǐÎîÏïỊịȈȉÌìỈỉȊȋĪīĮįƗɨĨĩḬḭı',
    'j': u'ĴĵɈɉ',
    'k': u'ḰḱǨǩĶķⱩⱪꝂꝃḲḳƘƙḴḵꝀꝁ',
    'l': u'ĹĺȽƚĽľĻļḼḽḶḷⱠⱡꝈꝉḺḻĿŀⱢɫŁł',
    'm': u'ḾḿṀṁṂṃⱮɱ',
    'n': u'ŃńŇňŅņṊṋṄṅṆṇǸǹƝɲṈṉȠƞÑñ',
    'o': u'ÓóŎŏǑǒÔôÖöȮȯỌọŐőȌȍÒòỎỏƠơȎȏꝊꝋꝌꝍŌōǪǫØøÕõŒœ',
    'p': u'ṔṕṖṗꝒꝓƤƥⱣᵽꝐꝑ',
    'q': u'Ꝗꝗ',
    'r': u'ŔŕŘřŖŗṘṙṚṛȐȑȒȓṞṟɌɍⱤɽ',
    's': u'ŚśŠšŞşŜŝȘșṠṡṢṣß$',
    't': u'ŤťŢţṰṱȚțȾⱦṪṫṬṭƬƭṮṯƮʈŦŧ',
    'u': u'ÚúŬŭǓǔÛûṶṷÜüṲṳỤụŰűȔȕÙùỦủƯưȖȗŪūŲųŮůŨũṴṵ',
    'v': u'ṾṿƲʋṼṽ',
    'w': u'ẂẃŴŵẄẅẆẇẈẉẀẁⱲⱳ',
    'x': u'ẌẍẊẋ',
    'y': u'ÝýŶŷŸÿẎẏỴỵỲỳƳƴỶỷỾỿȲȳɎɏỸỹ',
    'z': u'ŹźŽžẐẑⱫⱬŻżẒẓȤȥẔẕƵƶ'
}

# Map all diacritics to the corresponding lower-case base letter. The only
# remaining characters are lower-case a-z, ', -, 0-9, and space.
def nodiacritics(word):
    result = ''
    for ch in word:
        assert ch.lower() == ch
        for letter in diacritics:
            if ch in diacritics[letter]:
                ch = letter
                break
        assert (ch >= 'a' and ch <= 'z') or ch in '\'-0123456789 '
        result += ch
    return result

# Parse command line arguments.
#
# Syntax: python xml2dict.py [-v] -o output-file input-file
#
use = "Usage: %prog [options] dictionary.xml"
parser = OptionParser(usage = use)
parser.add_option("-v", "--verbose", dest="verbose", action="store_true", default=False, help="Set mode to verbose.")
parser.add_option("-o", "--output", dest="output", metavar="FILE", help="write output to FILE")
options, args = parser.parse_args()

# We expect the dictionary name to be present on the command line.
if len(args) < 1:
    print("Missing dictionary name.")
    exit(-1)
if options.output == None:
    print("Missing output file.")
    exit(-1)

# Read the input dictionary file into memory. We use dictionary files in XML
# format as defined by Android 4.1 (Jellybean).
file = open(args[0])
data = file.read()
file.close()

# Memory represention of the bloom filter we use for identifying whether
# a word might be in the vocabulary. The bloom filter is 256MB in size
# and is essentially an array of bits. The index into the filter is a
# bit offset, which we derive by hashing the word after we have removed
# all diacritics and converted the word to lower-case. To reduce false
# positives that are a result of hash collisions, we combine the
# lookup result of two hash functions.
BloomFilterSize = 256*1024
bf = array('B')
for i in range(BloomFilterSize):
    bf.append(0)

# BIG FAT WARNING: The hash functions used here much match latin-worker.js. If
# you change one without the other this will break very badly.
def hash1(word):
    h = 0
    for ch in word:
        h = h * 33 + ord(ch)
        h = h & 0xffffffff
    return h

def hash2(word):
    h = 0xdeadbeef
    for ch in word:
        h = h * 73 ^ ord(ch)
        h = h & 0xffffffff
    return h

def setbit(h):
    bf[(h / 8) % BloomFilterSize] |= (1 << (h % 8))

def hasbit(h):
    return (bf[(h / 8) % BloomFilterSize] & (1 << (h % 8))) != 0

def mark(word):
    setbit(hash1(word))
    setbit(hash2(word))

def ismarked(word):
    return hasbit(hash1(word)) and hasbit(hash2(word))

# Index mapping the first up to PrefixLimit characters of every word (prefix)
# in the dictionary to a hash table mapping the remainder of the word (suffix)
# to the corresponding word frequency.
#
# door -> { "" -> 133 }
# doorha -> { "ndle" -> 63 }
index = {}

# Add a word from the input dictionary to the index and bloom filter.
def add(word, freq, flags):
    # A frequency of 0 is used to terminate lists, so bump to 1.
    freq = max(1,freq)
    # Split the word into a prefix of maximum length PrefixLimit and a suffix.
    # If the word is less than PrefixLimit characters, the suffix will be
    # empty.
    # e.g. doorhandle
    # d : oorhandle
    # do : orhandle
    # doo : rhandle
    # door : handle
    # doorh : andle
    # and so on, up until we hit the PrefixLimit
    curLimit = 1;
    while curLimit < PrefixLimit:
        prefix = word[0:min(len(word), curLimit)]
        suffix = word[len(prefix):]
        curLimit = curLimit + 1
        # Mark in the bloomfilter the bit corresponding to the prefix. For this
        # we remove all diacritics from the prefix, and convert it to lower case.
        # This is done to reduce the search space the lookup code has to search
        # to find matches in. In the trie we will store the word in its original
        # form.
        mark(nodiacritics(prefix.lower()))
        if not prefix in index:
            index[prefix] = {}
        # Elements are inserted in order, in other words, if that suffix is already
        # available, or the maximum number of words is reached we can skip the word
        if not suffix in index[prefix] and len(index[prefix]) < MaxWordsPerNode:
            index[prefix][suffix] = freq

# Parse the XML input file and build the trie.
dom = parseString(data)
wordlist = dom.getElementsByTagName("wordlist")[0]
words = wordlist.getElementsByTagName("w")
for word in words:
    attr = word.attributes
    flags = attr.get("flags")
    if flags != None:
        flags = flags.nodeValue
    else:
        flags = ""
    freq = int(attr.get("f").nodeValue)
    if flags == "abbreviation" or freq <= 1:
        continue
    text = word.childNodes[0].nodeValue
    if len(text) <= 1:
        continue;
    add(text, freq, flags)

# Do some statistical sanity checking on the input data. Basically we expect
# a low collision rate in the bloom filter as long the hash functions work
# properly. 8% is not really a magic value. Its a good collisition ratio,
# and it happens to work for all current dictionaries. This assert is here
# to make sure we don't accidentally start using a reall bad hash function.
total = len(index)
collisions = 0
for word in words:
    # Convert diacritics to the corresponding base letter and everything has to
    # be lower case. We will look up the reversed version of the word, hoping
    # that it is not a valid word, but it contains all valid characters.
    word = nodiacritics(word.childNodes[0].nodeValue.lower())
    if ismarked(word[::-1]):
        collisions += 1
assert collisions < total * 0.08
print("collision ratio: {0}/{1}".format(collisions, total))

# If verbose mode was requested, write the index to a human readable file.
if options.verbose:
    output = StringIO()
    output.write('{\n')
    for key, word in index.iteritems():
        output.write('"' + key + '": "' + ':'.join([short + '/' + str(word[short]) for short in word]) + '",\n')
    output.write('}\n')
    print("index size: {0} words, {1} bytes".format(len(index), output.tell()))
    output.seek(0)
    f = open(options.output + ".index", "w")
    f.write(output.read().encode("utf-8"))
    f.close()

# Create the memory representation of the trie we store the vocabulary in.
# The first PrefixLimit characters of a word are stored in trie nodes (this is
# also called the suffix). The remainder is called suffix and is stored in the
# leaf node, and can be empty for words <= PrefixLimit characters.
def buildTrie():
    root = {}
    for prefix, suffixes in index.iteritems():
        node = root
        while prefix != "":
            ch = prefix[0:1]
            prefix = prefix[1:]
            if not ch in node:
                node[ch] = { "offset": 0 }
            node = node[ch]
        node["data"] = suffixes
    return root

# Write a single byte into the output file.
def writeByte(output, b):
    output.write(struct.pack("B", b))

# We deal with unicode characters and offsets that are both potentially larger
# than a single byte. However, in both cases they often are not. To reduce
# the file size we use a variable length encoding. VLU stands here for
# variable length unsigned. The highest bit (0x80) is used to indicate that
# another byte follows. We encode 7 bits per byte, starting with the least
# significant 7 bits of the value.
def writeVLU(output, u):
    while u >= 0x80:
        writeByte(output, (u & 0x7f) | 0x80)
        u >>= 7
    writeByte(output, u)

# Characters and strings can contain unicode, so we encode them as VLU.
def writeChar(output, ch):
    writeVLU(output, ord(ch))
def writeString(output, s):
    for ch in s:
        writeChar(output, ch)
    writeVLU(output, 0)

# We assert above that the input never contains these magical characters.
EndOfPrefixesSuffixesFollow = '#'
EndOfPrefixesNoSuffixes = '&'

# Emit a (sub-)trie consisting of a table of its child nodes (and the
# associated symbols) as well as the list of suffixes with the corresponding
# word frequencies. As each trie node is emitted, we store its offset in
# the output file in the trie itself. The offset to trie nodes is stored
# into the file before we actually arrive at the trie node itself (forward
# references). As a result, we need at least two passes to emit the trie.
# When emitting the actual node we verify whether the offset we saw the
# last time we emitted the trie is unchanged (since thats the offset we
# used when we emitted the forward reference). If not, we keep track of
# the incorrect offset emitted in the variable fixup and have to iterate
# again. Since we store offsets using variable length encoding, changes
# to a single offset can propagate to other parts of the file and affect
# other indexes. We often need a few iterations until all indexes in the file
# stablize.
#
# File format:
#   symbol 1 (VLU)
#   offset 1 (VLU)
#   symbol 2 (VLU)
#   offset 2 (VLU)
#   ...
#   # (EndOfPrefixesSuffixesFollow)
#   frequency 1 (single byte, 1..255)
#   suffix 1 (0-terminated, VLU for each character in the string)
#   frequency 2
#   suffix 2
#   ...
#   0 (we don't allow 0 as frequency, see above)
#   sub-trie 1
#   sub-trie 2
#   ...
#
# If a trie has no suffixes, we terminate the symbol/offset table with
# '&' instead of '#'. An assert in nodiacritics ensures that the dictionary
# never contains either of these symbols.
def emitTrie(output, trie):
    fixup = 0
    last = 0
    # Emit the prefix characters along with the delta encoded offsets.
    for ch in trie:
        # Skip over meta information (such as "offset" and "data").
        if not len(ch) == 1:
            continue
        writeChar(output, ch)
        offset = trie[ch]["offset"]
        writeVLU(output, offset - last)
        last = offset
    # Encode suffixes (if present).
    if "data" in trie:
        writeChar(output, EndOfPrefixesSuffixesFollow)
        # Emit the list of suffixes and their frequencies.
        suffixes = trie["data"]
        for suffix, freq in suffixes.iteritems():
            writeByte(output, freq)
            writeString(output, suffix)
        writeByte(output, 0)
    else:
        writeChar(output, EndOfPrefixesNoSuffixes)
    # Emit the child nodes of this node.
    for ch in trie:
        # Ignore meta information (such as "offset" and "data").
        if len(ch) != 1:
            continue
        child = trie[ch]
        offset = output.tell()
        if not "offset" in child or child["offset"] != offset:
            fixup += 1
            child["offset"] = offset
        # Track whether any of our children requires emitting the file again
        # because we had to write the offset before we knew it, or because
        # the offset changed since we emitted it.
        fixup += emitTrie(output, child)
    return fixup

# Emit the output data into a memory stream until the offsets in the trie
# stabilize.
#
# Format:
#   PrefixLimit (single byte, default is 6)
#   BloomFilterSize (single byte, as multiples of 65536)
#   base letter 1 (diacritics table, each character is VLU encoded)
#     diacritic 1 mapping to this base letter
#     diacritic 2
#     ...
#     0 (0-termination for the diacritic table for this base letter)
#   base letter 2
#     ..
#     0
#   0 (0-termination for the base letter table)
trie = buildTrie()
while True:
    output = BytesIO()
    # Emit the selected maximum prefix limit.
    writeByte(output, PrefixLimit)
    # Emit the size of the bloom filter.
    writeByte(output, BloomFilterSize / 65536)
    # Emit the diacritics table.
    for ch in diacritics:
        writeChar(output, ch)
        for d in diacritics[ch]:
            writeChar(output, d)
        writeVLU(output, 0)
    writeVLU(output, 0)
    # Emit the bloom filter itself.
    for b in bf:
        output.write(struct.pack("B", b))
    # Finally, emit the trie.
    fixup = emitTrie(output, trie)
    print("fixups remaining: {0}, compressed size: {1}".format(fixup, output.tell()))
    if fixup == 0:
        break

# Actually write the output data to disk.
output.seek(0)
f = open(options.output, "w")
f.write(output.read())
f.close()
