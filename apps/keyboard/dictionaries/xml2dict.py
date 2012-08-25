from array import array
from optparse import OptionParser 
from xml.dom.minidom import parseString
from io import BytesIO
from StringIO import StringIO
from collections import defaultdict
import sys, struct, operator, heapq

PrefixLimit = 6

# parse command line arguments
use = "Usage: %prog [options] dictionary.xml"
parser = OptionParser(usage = use)
parser.add_option("-v", "--verbose", dest="verbose", action="store_true", default=False, help="Set mode to verbose.")
parser.add_option("-o", "--output", dest="output", metavar="FILE", help="write output to FILE")
options, args = parser.parse_args()

# we expect the dictionary name to be present
if len(args) < 1:
    print("Missing dictionary name.")
    exit(-1)
if options.output == None:
    print("Missing output file.")
    exit(-1)

# read the input dictionary file
file = open(args[0])
data = file.read()
file.close()

# the vocabulary
vocabulary = []

# prefix index
index = {}

# the in-memory bloom filter
BloomFilterSize = 256*1024
bf = array('B')
for i in range(BloomFilterSize):
    bf.append(0)

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

def add(word, freq, flags):
    # frequency 0 is used to terminate lists
    if freq < 1:
        freq = 1
    # add to the vocabulary
    vocabulary.append([word, freq, flags])
    # add prefixes to the index
    prefix = word[0:min(len(word), PrefixLimit)]
    mark(prefix.lower())
    suffix = word[len(prefix):]
    if not prefix in index:
        index[prefix] = {}
    # combines entries if we processed word into something simpler
    if suffix in index[prefix]:
      index[prefix][suffix] = max(freq, index[prefix][suffix])
    else:
      index[prefix][suffix] = freq

# go through the dictionary and build the trie
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
    text = word.childNodes[0].nodeValue
    add(text, freq, flags)

# Do some statistical sanity checking:
print("index entries: {0}".format(len(index)))
collisions = 0
for word in words:
    if ismarked("x" + word.childNodes[0].nodeValue):
        collisions += 1
print("collisions: {0}".format(collisions))

# If verbose mode was requested, write the vocabulary and index to separate files.
if options.verbose:
    output = StringIO()
    for word, freq, flags in vocabulary:
        output.write(word + " " + str(freq) + " " + flags + "\n")
    print("vocabulary size: {0} words, {1} bytes".format(len(vocabulary), output.tell()))
    output.seek(0)
    f = open(options.output + ".words", "w")
    f.write(output.read().encode("utf-8"))
    f.close()

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

# Create a trie that we will use to look up prefixes
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

def writeByte(output, b):
    output.write(struct.pack("B", b))
def writeVLU(output, u):
    while u >= 0x80:
        writeByte(output, (u & 0x7f) | 0x80)
        u >>= 7
    writeByte(output, u)
def writeChar(output, ch):
    writeVLU(output, ord(ch))
def writeString(output, s):
    for ch in s:
        writeChar(output, ch)
    writeVLU(output, 0)

EndOfPrefixesSuffixesFollow = '#'
EndOfPrefixesNoSuffixes = '&'

# Emit the trie, compressing the symbol index
def emitTrie(output, trie):
    fixup = 0
    last = 0
    # Emit the prefix characters along with the delta encoded offsets.
    for ch in trie:
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
        # Ignore meta nodes like offset and data.
        if len(ch) != 1:
            continue
        child = trie[ch]
        offset = output.tell()
        if not "offset" in child or child["offset"] != offset:
            fixup += 1
            child["offset"] = offset
        # Track whether any of our children requires emitting the file again.
        fixup += emitTrie(output, child)
    return fixup

trie = buildTrie()
# Emit the trie until the offsets stabilize.
while True:
    output = BytesIO()
    # Emit the selected maximum prefix limit.
    writeByte(output, PrefixLimit)
    # Emit the size of the bloom filter.
    writeByte(output, BloomFilterSize / 65536)
    # Emit the bloom filter itself.
    for b in bf:
        output.write(struct.pack("B", b))
    # Finally, emit the trie.
    fixup = emitTrie(output, trie)
    print("fixups remaining: {0}, compressed size: {1}".format(fixup, output.tell()))
    if fixup == 0:
        break

# Write the compressed index to disk.
output.seek(0)
f = open(options.output, "w")
f.write(output.read())
f.close()
