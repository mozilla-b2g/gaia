RDF = install.rdf
CONTENT_SOURCES = $(shell find content/ -not -name \*~)
LOCALE_FILES = $(shell find locale/ -not -name \*~)

SOURCES = \
	bootstrap.js \
	chrome.manifest \
	$(RDF) \
	$(CONTENT_SOURCES) \
	$(LOCALE_FILES)

EXT_NAME := \
	${shell sed -n 's/.*<em:id>\([^<]*\)@gaiamobile.org<\/em:id>.*/\1/p' < $(RDF)}
EXT_VERSION := \
	${shell sed -n 's/.*<em:version>\([^<]*\)<\/em:version>.*/\1/p' < $(RDF)}

XPI_FILE := $(EXT_NAME)-$(EXT_VERSION).xpi

TIMESTAMP = ${shell date -u +"%Y%m%d%H%M"}
SNAPSHOT = $(EXT_NAME)-snapshot-$(TIMESTAMP).xpi

$(XPI_FILE): $(SOURCES)
	zip $@ $^

all: $(XPI_FILE)

clean:
	rm -f *.xpi

snapshot: $(XPI_FILE)
	@echo Creating snapshot: $(SNAPSHOT)
	@cp $(XPI_FILE) $(SNAPSHOT)
