# -*- coding: utf-8 -*-
"""

This script reads a XML-formatted word list and produces a dictionary
file used by the FirefoxOS virtual keyboard for word suggestions and
auto corrections.

The word lists come from the Android source: https://android.googlesource.com/platform/packages/inputmethods/LatinIME/+/master/dictionaries/

This script currently depends on the XML format of the Android
wordlists. (Eventually we might want to pre-process the XML files
to a plain text format and simplify this script so that it will work
with any plain-text word and frequency list)

The sample.xml file from the Android repo looks like this:

----------------------------------------------------------------------

    <!-- This is a sample wordlist that can be converted to a binary
         dictionary for use by the Latin IME. The format of the word
         list is a flat list of word entries. Each entry has a frequency
         between 255 and 0. Highest frequency words get more weight in
         the prediction algorithm. As a special case, a weight of 0 is
         taken to mean profanity - words that should not be considered a
         typo, but that should never be suggested explicitly. You can
         capitalize words that must always be capitalized, such as
         "January". You can have a capitalized and a non-capitalized
         word as separate entries, such as "robin" and "Robin". -->

    <wordlist>
      <w f="255">this</w>
      <w f="255">is</w>
      <w f="128">sample</w>
      <w f="1">wordlist</w>
    </wordlist>
----------------------------------------------------------------------

This script processes the word list and converts it to a Ternary
Search Tree (TST), as described in
gaia/apps/keyboard/js/imes/latin/predictions.js and also in

  http://en.wikipedia.org/wiki/Ternary_search_tree
  http://www.strchr.com/ternary_dags
  http://www.strchr.com/dawg_predictive

Note that the script does not convert the tree into a DAG (by sharing
common word suffixes) because it cannot maintain separate frequency
data for each word if the words share nodes.

This script balances the TST such that at any node the
highest-frequency word is found by following the center pointer. The
script also overlays a linked list on top of the tree. At any node,
the next most frequent word with the same parent node is found by
following the next pointer.

After building the TST data strucure this script serializes it into a
compact binary file with variable length nodes. The file begins with
the 8 ASCII characters "FxOSDICT" and four more bytes. Bytes 8, 9 and
10 are currently unused and byte 11 is a dictionary format version
number, currently 1.

Byte 12 file specifies the length of the longest word in the
dictionary.

After these first 13 bytes, the file contains a character table that
lists the characters used in the dictionary. This table is a two-byte
big-endian integer that specifies the number of entries in the
table. Each table entry is a big-endian two-byte character code
followed by a big-endian 4-byte number that specifies the number of
times the character appears in the dictionary.

After the character table (starting at byte 15 + num_entries*6), the
file consists of serialized nodes. Each node is betwen 1 byte and 6
bytes long, encoded as follows.

The first byte of each node is always an 8-bit bitfield: csnfffff

The c bit specifies whether this node represents a character. If c is
1 then a character code follows this first byte. If c is 0 then this
is a terminal node that marks the end of the word and it consists
of this single byte by itself.

The s bit specifies the size of the character associated with this
node. If s is 0 the character is one byte long. If s is 1 the
character is a big-endian two byte value.

The n bit specifies whether this node includes a next pointer. If n is 1 then
the character code is followed by a big-endian 3 byte number.

The fffff bits are represent a number between 0 and 31 and provide a
weight for the node. This is usually based on the word frequency data
from the dictionary, though this may be tuned by adjusting frequency
depending on word length, for example. At any node, these frequency
bits represent the weight of the highest frequency word under the
node. (And, as described in the predictions.js file, the tree is
balanced so that that highest frequency word is found by following the
chain of center pointers.)

If the c bit is set, the next one or two bytes (depending on the
s bit) of the node are the Unicode character code that is stored in
the node. Two-byte codes are big-endian.

If the n bit was set, the next 3 bytes are a big-endian 24-bit
unsigned integer offset to the start of the node pointed to by the
next pointer.

If the c bit was set the node has a character, and this means that it
also has a center pointer. We serialize the tree so that a node's
center pointer always points to the next node sequentially. So we
never need to write the center pointer to the file: it is always the
next node.

"""

from optparse import OptionParser
from xml.parsers import expat
import struct
import math

_NodeCounter = 0
_NodeRemoveCounter = 0
_NodeVisitCounter = 0
_EmitCounter = 0
_WordCounter = 0

_EndOfWord = chr(0)

# How many times do we use each character in this language
characterFrequency = {}
maxWordLength = 0
highestFreq = 0


_DiacriticIndex = {
    'a': 'ÁáĂăǍǎÂâÄäȦȧẠạȀȁÀàẢảȂȃĀāĄąÅåḀḁȺⱥÃãǼǽǢǣÆæ',
    'b': 'ḂḃḄḅƁɓḆḇɃƀƂƃ',
    'c': 'ĆćČčÇçĈĉĊċƇƈȻȼ',
    'd': 'ĎďḐḑḒḓḊḋḌḍƊɗḎḏĐđƋƌð',
    'e': 'ÉéĔĕĚěȨȩÊêḘḙËëĖėẸẹȄȅÈèẺẻȆȇĒēĘę',
    'f': 'ḞḟƑƒ',
    'g': 'ǴǵĞğǦǧĢģĜĝĠġƓɠḠḡǤǥ',
    'h': 'ḪḫȞȟḨḩĤĥⱧⱨḦḧḢḣḤḥĦħ',
    'i': 'ÍíĬĭǏǐÎîÏïỊịȈȉÌìỈỉȊȋĪīĮįƗɨĨĩḬḭı',
    'j': 'ĴĵɈɉ',
    'k': 'ḰḱǨǩĶķⱩⱪꝂꝃḲḳƘƙḴḵꝀꝁ',
    'l': 'ĹĺȽƚĽľĻļḼḽḶḷⱠⱡꝈꝉḺḻĿŀⱢɫŁł',
    'm': 'ḾḿṀṁṂṃⱮɱ',
    'n': 'ŃńŇňŅņṊṋṄṅṆṇǸǹƝɲṈṉȠƞÑñ',
    'o': 'ÓóŎŏǑǒÔôÖöȮȯỌọŐőȌȍÒòỎỏƠơȎȏꝊꝋꝌꝍŌōǪǫØøÕõŒœ',
    'p': 'ṔṕṖṗꝒꝓƤƥⱣᵽꝐꝑ',
    'q': 'Ꝗꝗ',
    'r': 'ŔŕŘřŖŗṘṙṚṛȐȑȒȓṞṟɌɍⱤɽ',
    's': 'ŚśŠšŞşŜŝȘșṠṡṢṣß$',
    't': 'ŤťŢţṰṱȚțȾⱦṪṫṬṭƬƭṮṯƮʈŦŧ',
    'u': 'ÚúŬŭǓǔÛûṶṷÜüṲṳỤụŰűȔȕÙùỦủƯưȖȗŪūŲųŮůŨũṴṵ',
    'v': 'ṾṿƲʋṼṽ',
    'w': 'ẂẃŴŵẄẅẆẇẈẉẀẁⱲⱳ',
    'x': 'ẌẍẊẋ',
    'y': 'ÝýŶŷŸÿẎẏỴỵỲỳƳƴỶỷỾỿȲȳɎɏỸỹ',
    'z': 'ŹźŽžẐẑⱫⱬŻżẒẓȤȥẔẕƵƶ'
}
_Diacritics = {} # the mapping from accented to non-accented letters

# Build the _Diacritics mapping
for letter in _DiacriticIndex:
    for diacritic in _DiacriticIndex[letter]:
        _Diacritics[diacritic] = letter


# Data Structure for TST Tree
class TSTNode:
    # Constructor for creating a new TSTNode
    def __init__(self, ch):
        global _NodeCounter
        _NodeCounter += 1
        self.ch = ch
        self.left = self.center = self.right = None
        self.frequency = 0 # maximum frequency
        # store the count for balancing the tst
        self.count = 0

class TSTTree:
    # Constructor for creating a TST Tree
    def __init__(self):
        self.table = {}

    # Insert a word into the TSTTree
    def insert(self, node, word, freq):
        ch = word[0]

        if not node:
            node = TSTNode(ch)
        if ch < node.ch:
            node.left = self.insert(node.left, word, freq)
        elif ch > node.ch:
            node.right = self.insert(node.right, word, freq)
        else:
            node.frequency = max(node.frequency, freq)
            if len(word) > 1:
                node.center = self.insert(node.center, word[1:], freq)
        return node

    # Balance the TST
    # set the number of children nodes
    def setCount(self, node):
        if not node:
            return 0
        node.count = self.setCount(node.left) + self.setCount(node.right) + 1
        self.setCount(node.center)
        return node.count

    def rotateRight(self, node):
        tmp = node.left
        # move the subtree between tmp and node
        node.left = tmp.right
        # swap tmp and node
        tmp.right = node
        # restore count field
        node.count = (node.left.count if node.left else 0) + (node.right.count if node.right else 0) + 1
        tmp.count = (tmp.left.count if tmp.left else 0) + tmp.right.count + 1
        return tmp

    def rotateLeft(self, node):
        tmp = node.right
        # move the subtree between tmp and node
        node.right = tmp.left
        # swap tmp and node
        tmp.left = node
        # restore count field
        node.count = (node.left.count if node.left else 0) + (node.right.count if node.right else 0) + 1
        tmp.count = tmp.left.count + (tmp.right.count if tmp.right else 0) + 1
        return tmp

    def divide(self, node, divCount):
        leftCount = (node.left.count if node.left else 0)
        # if the dividing node is in the left subtree, go down to it
        if divCount < leftCount:
            node.left = self.divide(node.left, divCount)
            # on the way back from the dividing node to the root, do right rotations
            node = self.rotateRight(node)
        elif divCount > leftCount:
            node.right = self.divide(node.right, divCount - leftCount - 1)
            node = self.rotateLeft(node)
        return node

    # balance level of TST
    def balanceLevel(self, node):
        if not node:
            return node

        # make center node the root
        node = self.divide(node, node.count // 2)
        # balance subtrees recursively
        node.left = self.balanceLevel(node.left)
        node.right = self.balanceLevel(node.right)

        node.center = self.balanceTree(node.center)
        return node

    def normalizeChar(self, ch):
        ch = ch.lower()
        if ch in _Diacritics:
            ch = _Diacritics[ch]
        return ch

    def collectLevel(self, level, node):
        if not node:
            return
        # I'm not convinced we need to do this.
        # And I can't understand the part of the search algorithm
        # that uses this, so commenting it out for now
        # level.setdefault(self.normalizeChar(node.ch), []).append(node)
        level.append(node)
        self.collectLevel(level, node.left)
        self.collectLevel(level, node.right)

    def sortLevelByFreq(self, node):
        # Collect nodes on the same level
        nodes = []
        self.collectLevel(nodes, node)

        # See the comment in collectLevel
        # # Sort each array within the level
        # for items in level:
        #     if (len(items) > 1):
        #         items.sort(key = lambda node: node.ch)
        #         items.sort(key = lambda node: node.frequency, reverse = True)

        # Sort by frequency joining nodes with lowercase/uppercase/accented versions of the same character
        nodes.sort(key = lambda node: node.ch)
        nodes.sort(key = lambda node: node.frequency, reverse = True)
        # nodes = []
        # for items in level:
        #     nodes += items

        # Add next/prev pointers to each node
        prev = None
        for i in range(len(nodes)):
            nodes[i].next = nodes[i + 1] if i < len(nodes) - 1 else None
            nodes[i].prev = prev
            prev = nodes[i]
        return nodes[0]

    # find node in the subtree of root and promote it to root
    def promoteNodeToRoot(self, root, node):
        if node.ch < root.ch:
            root.left = self.promoteNodeToRoot(root.left, node)
            return self.rotateRight(root)
        elif node.ch > root.ch:
            root.right = self.promoteNodeToRoot(root.right, node)
            return self.rotateLeft(root)
        else:
            return root

    # balance the whole TST
    def balanceTree(self, node):
        if not node:
            return

        # promote to root the letter with the highest maximum frequency
        # of a suffix starting with this letter
        node = self.promoteNodeToRoot(node, self.sortLevelByFreq(node))

        # balance other letters on this level of the tree
        node.left = self.balanceLevel(node.left)
        node.right = self.balanceLevel(node.right)
        node.center = self.balanceTree(node.center)
        return node

    def balance(self, root):
        self.setCount(root)
        root = self.balanceTree(root)
        return root

# Serialize the tree to an array. Do it depth first, folling the
# center pointer first because that might give us better locality
def serializeNode(node, output):
    global _EmitCounter

    output.append(node)
    node.offset = len(output)

    _EmitCounter += 1
    if _EmitCounter % 100000 == 0:
        print("          >>> (serializing " + str(_EmitCounter) + "/" +
              str(_NodeCounter) + ")")

    if (node.ch == _EndOfWord and node.center):
        print("nul node with a center!");
    if (node.ch != _EndOfWord and not node.center):
        print("char node with no center!");

    # do the center node first so words are close together
    if node.center:
        serializeNode(node.center, output)
    if node.left:
        serializeNode(node.left, output)
    if node.right:
        serializeNode(node.right, output)

def serializeTree(root):
    output = []
    serializeNode(root, output)
    return output

# Make a pass through the array of nodes and figure out the size and offset
# of each one.
def computeOffsets(nodes):
    offset = 0;
    for i in range(len(nodes)):
        node = nodes[i]
        node.offset = offset;

        if node.ch == _EndOfWord:
            charlen = 0
        elif ord(node.ch) <= 255:
            charlen = 1
        else:
            charlen = 2

        nextlen = 3 if node.next else 0

        offset = offset + 1 + charlen + nextlen
    return offset

def writeUint24(output, x):
    output.write(struct.pack("B", (x >> 16) & 0xFF))
    output.write(struct.pack("B", (x >> 8) & 0xFF))
    output.write(struct.pack("B", x & 0xFF))

def emitNode(output, node):
    charcode = 0 if node.ch == _EndOfWord else ord(node.ch)

    cbit = 0x80 if charcode != 0 else 0
    sbit = 0x40 if charcode > 255 else 0
    nbit = 0x20 if node.next else 0

    if node.frequency == 0:
      freq = 0 #zero means profanity
    else:
      freq = 1 + int(node.frequency * 31) # values > 0 map the range 1 to 31

    firstbyte = cbit | sbit | nbit | (freq & 0x1F)
    output.write(struct.pack("B", firstbyte))

    if cbit:      # If there is a character for this node
        if sbit:  # if it is two bytes long
            output.write(struct.pack("B", charcode >> 8))
        output.write(struct.pack("B", charcode & 0xFF))

    # Write the next node if we have one
    if nbit:
        writeUint24(output, node.next.offset)

def emit(output, nodes):
    nodeslen = computeOffsets(nodes)

    # 12-byte header with version number
    output.write(b"FxOSDICT\x00\x00\x00\x01")

    # Output the length of the longest word in the dictionary.
    # This allows to easily reject input that is longer
    output.write(struct.pack("B", min(maxWordLength, 255)));

    # Output a table of letter frequencies. The search algorithm may
    # want to use this to decide which diacritics to try, for example.
    characters = sorted(list(characterFrequency.items()),
                        key = lambda item: item[1],
                        reverse = True)
    output.write(struct.pack(">H", len(characters)))   # Num items that follow
    for item in characters:
        output.write(struct.pack(">H", ord(item[0])))  # 16-bit character code
        output.write(struct.pack(">I", item[1]))       # 32-bit count

    # Write the nodes of the tree to the file.
    for i in range(len(nodes)):
        node = nodes[i]
        emitNode(output, node)


# Parse command line arguments.
#
# Syntax: python xml2dict.py [-v] -o output-file input-file
#
use = "Usage: %prog [options] dictionary.xml"
parser = OptionParser(usage = use)
parser.add_option("-o", "--output", dest="output", metavar="FILE", help="write output to FILE")
options, args = parser.parse_args()

# We expect the dictionary name to be present on the command line.
if len(args) < 1:
    print("Missing dictionary name.")
    exit(-1)
if options.output == None:
    print("Missing output file.")
    exit(-1)

# print some status statements to the console
print ("[0/4] Creating dictionary ... (this might take a long time)" )
print ("[1/4] Reading XML wordlist and creating TST ..." )

def start_element(name, attrs):
    global lastName, highestFreq, lastFreq, lastFlags, lastWord
    lastName = name
    lastFlags = ""
    if "flags" in attrs:
        lastFlags = attrs["flags"]
    lastFreq = -1
    if "f" in attrs:
        if not highestFreq:  # the first word in the file has the highest freq.
            highestFreq = int(attrs["f"])
        lastFreq = int(attrs["f"])
    if lastName == 'w':
        lastWord = ''

def char_data(text):
    global lastWord
    if lastName == 'w':
        lastWord += text

def end_element(name):
    if name != 'w' or lastName != 'w':
        return

    global tstRoot, _WordCounter, lastWord, maxWordLength

    lastWord = lastWord.strip()

    # Find the longest word in the dictionary
    if len(lastWord) > maxWordLength:
        maxWordLength = len(lastWord)

    # Scale the frequencies so that they are > 0 and < 1
    # Later, when serializing the dictionary, we'll scale to fit in 5 bits
    freq = lastFreq / (highestFreq + 1)

    tstRoot = tree.insert(tstRoot, lastWord + _EndOfWord, freq)

    # keep track of the letter frequencies
    for ch in lastWord:
        if ch in characterFrequency:
            characterFrequency[ch] += 1
        else:
            characterFrequency[ch] = 1

    _WordCounter += 1
    if _WordCounter % 10000 == 0:
        print("          >>> (" + str(_WordCounter) + " words read)")

tstRoot = None
tree = TSTTree()

# Parse the XML input file and build the trie.
p = expat.ParserCreate()
p.StartElementHandler = start_element
p.CharacterDataHandler = char_data
p.EndElementHandler = end_element
p.ParseFile(open(args[0], 'rb'))

print ("[2/4] Balancing Ternary Search Tree ...")
tstRoot = tree.balance(tstRoot)

print ("[3/4] Serializing TST ...");
nodes = serializeTree(tstRoot)

print ("[4/4] Emitting TST ...")
output = open(options.output, "wb")
emit(output, nodes)
output.close()

print ("Successfully created Dictionary")

exit()
