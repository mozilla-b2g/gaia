.PHONY: default
default: lint test

.PHONY: lint
lint:
	gjslint --recurse . --disable "220,225" --exclude_directories "node_modules"

.PHONY: test
test:
	./node_modules/.bin/mocha
