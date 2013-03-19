# -*- coding: utf-8 -*-

from optparse import OptionParser 
from xml.parsers import expat
import struct

_NodeCounter = 0
_NodeRemoveCounter = 0
_NodeVisitCounter = 0
_EmitCounter = 0

_EndOfWord = '$'

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
        self.frequency = 0 # averaged maximum frequency
        # store the count for balancing the tst
        self.count = 0
        # store the number of tree nodes compressed into one DAG node
        self.ncompressed = 1
        # store hash for creating the DAG
        self.hash = 0

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
        level.setdefault(self.normalizeChar(node.ch), []).append(node)
        self.collectLevel(level, node.left)
        self.collectLevel(level, node.right)
    
    def sortLevelByFreq(self, node):
        # Collect nodes on the same level (lowercase/uppercase/accented characters are grouped together)
        level = {}
        self.collectLevel(level, node)
        level = list(level.values())
        
        # Sort by frequency joining nodes with lowercase/uppercase/accented versions of the same character
        level.sort(key = lambda items: max(items, key = lambda node: node.frequency).frequency, reverse = True)
        nodes = []
        for items in level:
            nodes += items
        
        # Add nextFreq/prevFreq pointers to each node
        prevFreq = None
        for i in range(len(nodes)):
            nodes[i].nextFreq = nodes[i + 1] if i < len(nodes) - 1 else None
            nodes[i].prevFreq = prevFreq
            prevFreq = nodes[i]
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
        

    # Compress TST into DAWG
    
   
    # Compare two subtrees. If they are equal, return the mapping from the nodes
    # in nodeA to the corresponding nodes in nodeB. If they are not equal, return False
    def equal(self, nodeA, nodeB, mapping):
        if nodeA == None or nodeB == None:
            return mapping if nodeA == None and nodeB == None else False
        # two nodes are equal if their characters and their
        # children are equal
        mapping[nodeA] = nodeB
        return mapping if nodeA.ch == nodeB.ch and \
               self.equal(nodeA.left,   nodeB.left, mapping) and \
               self.equal(nodeA.center, nodeB.center, mapping) and \
               self.equal(nodeA.right,  nodeB.right, mapping) else False

    # Return True if all nextFreq nodes are in the nodeA subtree
    # at the same positions as in the nodeB subtree
    def equalNextFreq(self, mapping):
        for node in mapping:
            if node.nextFreq == None and mapping[node].nextFreq == None:
                continue
            if node.nextFreq not in mapping:
                return False
            if mapping[node.nextFreq] != mapping[node].nextFreq:
                return False
        return True
    
    # find the head of the nextFreq/prevFreq linked list
    def findListHead(self, node, mapping):
        while node.prevFreq and node.prevFreq in mapping:
            node = node.prevFreq
        return node
    
    def calculateHash(self, node):
        if not node:
            return 0
        assert (len(node.ch) == 1)
        node.hash = (ord(node.ch) - ord('a')) + 31 * self.calculateHash(node.center)
        node.hash ^= self.calculateHash(node.left)
        node.hash ^= self.calculateHash(node.right)
        node.hash ^= (node.hash >> 16)
        return node.hash

    # find the node in the hash table. if it does not exist,
    # add a new one, return true and the original node,
    # if not, return false and the existing node
    def checkAndRemoveDuplicate(self, node):
        global _NodeRemoveCounter

        if node.hash in self.table:
            for candidate in self.table[node.hash]:
                mapping = self.equal(node, candidate, {})
                if mapping and self.equalNextFreq(mapping):
                    # this node already exists in the table.
                    # remove the duplicate
                    _NodeRemoveCounter += len(mapping)
                    head = self.findListHead(node, mapping)
                    if head.prevFreq:
                        head.prevFreq.nextFreq = mapping[head]
                    self.addFreq(candidate, node)
                    return False, candidate
        self.table.setdefault(node.hash, []).append(node)
        return True, node
        
    # recursively add frequency
    def addFreq(self, node, candidate):
        if not node:
            return
        #print(node.frequency, 'add', candidate.frequency, 'in', node.ch)
        node.frequency += candidate.frequency
        node.ncompressed += 1
        self.addFreq(node.left, candidate.left)
        self.addFreq(node.right, candidate.right)
        self.addFreq(node.center, candidate.center)
    
    # remove duplicates suffixes starting from the longest one
    def removeDuplicates(self, node):
        global _NodeVisitCounter
        _NodeVisitCounter += 1
        if _NodeVisitCounter % 10000 == 0:
            print ("          >>> (visiting: " +
                   str(_NodeVisitCounter) + "/" + str(_NodeCounter) +
                   ", removed: " + str(_NodeRemoveCounter) + ")")

        if node.left:
            # if the node already exists in the table
            # (checkAndRemoveDuplicate returns false),
            # its children were checked for duplicates already
            # avoid duplicate checking
            checkDeeper, node.left = self.checkAndRemoveDuplicate(node.left)
            if checkDeeper:
                self.removeDuplicates(node.left)
        if node.right:
            checkDeeper, node.right = self.checkAndRemoveDuplicate(node.right)
            if checkDeeper:
                self.removeDuplicates(node.right)
        if node.center:
            checkDeeper, node.center = self.checkAndRemoveDuplicate(node.center)
            if checkDeeper:
                self.removeDuplicates(node.center)
        return node
        
    def averageFrequencies(self):
        for hash in self.table:
            for candidate in self.table[hash]:
                candidate.frequency /= candidate.ncompressed
        del self.table
        
    # For debugging
    def printNode(self, node, level, path):
        print(' ' * level, path, node.ch, '(', \
                node.nextFreq.ch if node.nextFreq else '', ')', id(node), '(', \
                id(node.nextFreq) if node.nextFreq else 'None', ')', \
                node.frequency, '^')
    
    def printDAG(self, root):
        stack = []
        visited = []
        stack.append((root, 0, ''))
    
        while stack:
            node, level, path = stack.pop()
            if node in visited:
                self.printNode(node, level, path)
                continue
            visited.append(node)
    
            self.printNode(node, level, path)

            if node.right:
                stack.append((node.right, level + 1, 'R'))
            if node.left:
                stack.append((node.left, level + 1, 'L'))
            if node.center:
                stack.append((node.center, level + 1, '='))            

    # traverse the tree using DFS to find all possible candidates
    # starting with the given prefix (for debugging)
    def predict(self, root, prefix, maxsuggestions):
        def addNextFreq(node, prefix):
            nonlocal candidates

            # Insert new node into candidates (sorted by frequency)
            i = len(candidates) - 1
            while i >= 0 and node.frequency > candidates[i][0]:
                i -= 1

            # Don't insert at the end if already have the required number of candidates
            if i == len(candidates) - 1 and len(candidates) >= maxsuggestions:
                return
            
            candidates.insert(i + 1, (node.frequency, node, prefix))
            
        def findPrefix(node, prefix):
            if not node: # not found
                return None
            if len(prefix) == 0:
                return node
            if prefix[0] < node.ch:
                return findPrefix(node.left, prefix)
            elif prefix[0] > node.ch:
                return findPrefix(node.right, prefix)
            else:
                return findPrefix(node.center, prefix[1:])
        
        node = findPrefix(root, prefix)
        if not node:
            return []
        
        # find the predictions
        candidates = [(node.frequency, node, prefix)]
        suggestions = []
        
        index = 0
        while len(candidates) > 0 and len(suggestions) < maxsuggestions:
            # Find the best candidate
            node = candidates[0][1]
            prefix = candidates[0][2]
            candidates.pop(0)
            while node.ch != _EndOfWord:
                if node.nextFreq: # Add the next best suggestion
                    addNextFreq(node.nextFreq, prefix)
                prefix += node.ch
                node = node.center
            if node.nextFreq: # Add the next best suggestion
                addNextFreq(node.nextFreq, prefix)
            suggestions.append(prefix)
            #print(suggestions, end=' ')
            #for s in candidates:
            #    print(s[0], s[2] + ',', end='')
            #print()
            index += 1
        
        print ("suggestions: " + str(len(suggestions)))

        return suggestions


def writeInt16(output, int16):
    output.write(struct.pack("H", int16))

def emitChild(output, verboseOutput, node, child, letter):
    offset = child.offset if child else 0
    writeInt16(output, offset & 0xFFFF)
    if verboseOutput:
        verboseOutput.write(", " + letter + ": " + str(offset))
    return offset >> 16

def emitNodes(output, verboseOutput, nodes):
    i = 0
    for node in nodes:
        writeInt16(output, ord(node.ch) if node.ch != _EndOfWord else 0)
        if verboseOutput:
            ch = node.ch if ord(node.ch) < 0x80 else 'U+' + hex(ord(node.ch))
            verboseOutput.write("["+ str(node.offset) +"] { ch: " + ch)
        
        #print("["+ str(node.offset) +"] { ch: " + ch + ' next:' +
        #        (node.nextFreq.ch if node.nextFreq else ''))
        highbits = emitChild(output, verboseOutput, node, node.left, 'L')
        highbits = (highbits << 4) | emitChild(output, verboseOutput, node, node.center, 'C')
        highbits = (highbits << 4) | emitChild(output, verboseOutput, node, node.right, 'R')
        highbits = (highbits << 4) | emitChild(output, verboseOutput, node, node.nextFreq, 'N')
        writeInt16(output, highbits)
        if verboseOutput:
            verboseOutput.write(", h: " + str(highbits))
        writeInt16(output, round(node.frequency))
        if verboseOutput:
            verboseOutput.write(", f: " + str(round(node.frequency)))
            verboseOutput.write("}\n")
    
        i += 1
        if i % 10000 == 0:
            print("          >>> (emitting " + str(i) + "/" + str(len(nodes)) + ")")


# emit the tree BFS
def sortTST(root):
    
    global _EmitCounter
    queue = []
    visited = {}
    output = []
    queue.append(root)

    while queue:
        node = queue.pop(0)
        if node in visited:
            continue
        visited[node] = True
        output.append(node)
        node.offset = len(output)

        _EmitCounter += 1
        if _EmitCounter % 10000 == 0:
            print("          >>> (sorting " + str(_EmitCounter) + "/" +
                  str(_NodeCounter - _NodeRemoveCounter) + ")")

        if node.left:
            queue.append(node.left)
        if node.center:
            queue.append(node.center)
        if node.right:
            queue.append(node.right)
    
    return output

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

# print some status statements to the console
print ("[0/8] Creating dictionary ... (this might take a long time)" )
print ("[1/8] Reading XML wordlist and creating TST ..." )

_WordCounter = 0

def start_element(name, attrs):
    global lastName, lastFreq, lastFlags, lastWord
    lastName = name
    lastFlags = ""
    if "flags" in attrs:
        lastFlags = attrs["flags"]
    lastFreq = -1
    if "f" in attrs:
        lastFreq = int(attrs["f"])
    if lastName == 'w':
        lastWord = ''

def char_data(text):
    global lastWord
    if lastName == 'w':
        lastWord += text

def end_element(name):
    global tstRoot, _WordCounter
    if name != 'w' or lastName != 'w' or \
        lastFlags == "abbreviation" or \
        lastFreq <= 1 or len(lastWord) <= 1:
        return
    tstRoot = tree.insert(tstRoot, lastWord + _EndOfWord, lastFreq)
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

print ("[2/8] Balancing Ternary Search Tree ...")
tstRoot = tree.balance(tstRoot)

#tree.printDAG(tstRoot)

print ("[3/8] Calculating hash for nodes ...")
tree.calculateHash(tstRoot)
print ("[4/8] Compressing TST to DAG ... (removing duplicate nodes)")
tstRoot = tree.removeDuplicates(tstRoot)

print ("[5/8] Average the frequencies")
tree.averageFrequencies()

print ("[6/8] Sorting TST ... (" +
       str(_NodeCounter) + " - " + str(_NodeRemoveCounter) + " = " +
       str(_NodeCounter - _NodeRemoveCounter) + " nodes).")

nodes = sortTST(tstRoot)

#tree.printDAG(tstRoot)

print ("[7/8] Emitting TST ...")

verboseOutput = None
if options.verbose:
    verboseOutput = open(options.output + ".tst", "w")

output = open(options.output, "wb")
emitNodes(output, verboseOutput, nodes)
output.close()

if verboseOutput:
    verboseOutput.close()

print ("[8/8] Successfully created Dictionary")

exit()

# Tests the matching function
# while True:
#     prefix = input()
#     if prefix == '':
#         break
#     suggestions = tree.predict(tstRoot, prefix, 10)
#     print(suggestions)
