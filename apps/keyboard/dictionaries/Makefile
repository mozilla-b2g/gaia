DICTIONARY_PATH =../../../dictionaries

DICTS = $(shell cd $(DICTIONARY_PATH) && ls *.xml | sed -e 's/_wordlist\.xml/.dict/')

VPATH = $(DICTIONARY_PATH)

%.dict: %_wordlist.xml xml2dict.py
	python xml2dict.py -o $@ $<

all: $(DICTS)
