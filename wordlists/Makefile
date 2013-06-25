# After building a dictionary here, move the resulting .dict file to
# apps/keyboard/js/imes/latin/dictionaries/ and check it in.

WORDLISTS = $(shell ls android)
DICTIONARIES = $(patsubst %_wordlist.xml.gz,%.dict,$(WORDLISTS))

all: $(DICTIONARIES)

%.dict: android/%_wordlist.xml.gz words2dict
	./words2dict -o $@ $<

