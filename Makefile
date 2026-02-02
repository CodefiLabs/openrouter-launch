# Makefile for openrouter-launch
# https://github.com/truefrontier/openrouter-launch

PREFIX ?= /usr/local
BINDIR := $(PREFIX)/bin
SCRIPT := bin/openrouter-launch

.PHONY: all install uninstall test clean help

all: test

help:
	@echo "openrouter-launch Makefile"
	@echo ""
	@echo "Targets:"
	@echo "  install    Install to $(BINDIR)"
	@echo "  uninstall  Remove from $(BINDIR)"
	@echo "  test       Run shellcheck and syntax validation"
	@echo "  clean      Remove generated files"
	@echo ""
	@echo "Variables:"
	@echo "  PREFIX     Installation prefix (default: /usr/local)"

install: test
	@echo "Installing openrouter-launch to $(BINDIR)..."
	@mkdir -p $(BINDIR)
	@cp $(SCRIPT) $(BINDIR)/openrouter-launch
	@chmod +x $(BINDIR)/openrouter-launch
	@ln -sf $(BINDIR)/openrouter-launch $(BINDIR)/or-launch
	@echo "✓ Installed openrouter-launch"
	@echo "✓ Created symlink or-launch"

uninstall:
	@echo "Uninstalling openrouter-launch..."
	@rm -f $(BINDIR)/openrouter-launch
	@rm -f $(BINDIR)/or-launch
	@echo "✓ Removed openrouter-launch and or-launch"

test:
	@echo "Running tests..."
	@bash -n $(SCRIPT) && echo "✓ Syntax check passed"
	@if command -v shellcheck >/dev/null 2>&1; then \
		shellcheck --severity=error $(SCRIPT) && echo "✓ Shellcheck passed (errors only)"; \
	else \
		echo "⚠ shellcheck not installed, skipping"; \
	fi

clean:
	@echo "Nothing to clean"
