YUIDOCJS?=./node_modules/yuidocjs/lib/cli.js
DOC_PARAMS?=--themedir ./docs/theme
DOC_DIR=./lib/marionette
DOC_REMOTE?=upstream

.PHONY: link
link:
	npm link
	npm link marionette-client

.PHONY: clean
clean:
	npm unlink marionette-client

.PHONY: doc-server
doc-server: node_modules
	$(YUIDOCJS) $(DOC_PARAMS) --server $(DOC_DIR)

.PHONY: doc-publish
doc-publish: node_modules
	git fetch $(DOC_REMOTE)
	git checkout --detach
	git branch -D gh-pages || true
	git branch gh-pages
	git checkout -
	git checkout gh-pages
	$(YUIDOCJS) $(DOC_PARAMS) -o ./api-docs-temp/ $(DOC_DIR) -c ./yuidoc.json
	rm -Rf api-docs
	mv api-docs-temp api-docs
	git add -f api-docs
	git commit -m "regenerate api docs"
	git push -f $(DOC_REMOTE) gh-pages
	git checkout -
	rm -Rf api-docs-temp/

.PHONY: test
test: link
	./node_modules/.bin/marionette-mocha \
		--profile-base $(shell pwd)/profile.js \
		$(shell find test/integration -name "*-test.js")
