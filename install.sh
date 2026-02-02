#!/usr/bin/env bash
#
# openrouter-launch installer
# https://github.com/vibeathon-us/openrouter-launch
#
# Usage: curl -fsSL https://raw.githubusercontent.com/vibeathon-us/openrouter-launch/main/install.sh | bash
#

set -euo pipefail

#######################################
# Configuration
#######################################

REPO="vibeathon-us/openrouter-launch"
SCRIPT_NAME="openrouter-launch"
SYMLINK_NAME="or-launch"

# Installation directories (user install preferred, system install as fallback)
USER_BIN="$HOME/.local/bin"
SYSTEM_BIN="/usr/local/bin"

#######################################
# Helpers
#######################################

log_info() {
    echo "[INFO] $*"
}

log_error() {
    echo "[ERROR] $*" >&2
}

log_success() {
    echo "[OK] $*"
}

#######################################
# Version detection
#######################################

get_latest_version() {
    local version
    # Try GitHub API first
    version=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" 2>/dev/null \
        | grep '"tag_name"' \
        | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/' \
        | sed 's/^v//')

    if [[ -n "$version" ]]; then
        echo "$version"
        return 0
    fi

    # Fallback: try to get from tags
    version=$(curl -fsSL "https://api.github.com/repos/$REPO/tags" 2>/dev/null \
        | grep '"name"' \
        | head -1 \
        | sed -E 's/.*"name": *"([^"]+)".*/\1/' \
        | sed 's/^v//')

    if [[ -n "$version" ]]; then
        echo "$version"
        return 0
    fi

    log_error "Could not determine latest version"
    return 1
}

#######################################
# Installation
#######################################

determine_install_dir() {
    # Check if we can write to user bin
    if [[ -w "$USER_BIN" ]] || mkdir -p "$USER_BIN" 2>/dev/null; then
        echo "$USER_BIN"
        return 0
    fi

    # Check if we have sudo or can write to system bin
    if [[ -w "$SYSTEM_BIN" ]] || [[ "$EUID" -eq 0 ]]; then
        echo "$SYSTEM_BIN"
        return 0
    fi

    # Fall back to user bin, will create it
    echo "$USER_BIN"
}

download_script() {
    local version="$1"
    local dest="$2"
    local url="https://raw.githubusercontent.com/$REPO/v$version/bin/$SCRIPT_NAME"

    log_info "Downloading openrouter-launch v$version..."

    if ! curl -fsSL "$url" -o "$dest"; then
        # Try without v prefix
        url="https://raw.githubusercontent.com/$REPO/$version/bin/$SCRIPT_NAME"
        if ! curl -fsSL "$url" -o "$dest"; then
            # Try main branch as fallback
            url="https://raw.githubusercontent.com/$REPO/main/bin/$SCRIPT_NAME"
            if ! curl -fsSL "$url" -o "$dest"; then
                log_error "Failed to download script"
                return 1
            fi
        fi
    fi

    return 0
}

install_script() {
    local install_dir="$1"
    local script_path="$install_dir/$SCRIPT_NAME"
    local symlink_path="$install_dir/$SYMLINK_NAME"
    local use_sudo=""

    # Check if we need sudo
    if [[ ! -w "$install_dir" ]] && [[ "$EUID" -ne 0 ]]; then
        if command -v sudo &>/dev/null; then
            use_sudo="sudo"
            log_info "Using sudo for installation to $install_dir"
        else
            log_error "Cannot write to $install_dir and sudo not available"
            return 1
        fi
    fi

    # Create directory if needed
    $use_sudo mkdir -p "$install_dir"

    # Download to temp file first
    local temp_file
    temp_file=$(mktemp)
    trap "rm -f '$temp_file'" EXIT

    local version
    version=$(get_latest_version) || version="main"

    if ! download_script "$version" "$temp_file"; then
        return 1
    fi

    # Verify script is valid bash
    if ! bash -n "$temp_file"; then
        log_error "Downloaded script has syntax errors"
        return 1
    fi

    # Install script
    $use_sudo cp "$temp_file" "$script_path"
    $use_sudo chmod +x "$script_path"

    # Create symlink
    $use_sudo ln -sf "$script_path" "$symlink_path"

    log_success "Installed $SCRIPT_NAME to $script_path"
    log_success "Created symlink $SYMLINK_NAME"

    return 0
}

check_path() {
    local install_dir="$1"

    # Check if install dir is in PATH
    if [[ ":$PATH:" != *":$install_dir:"* ]]; then
        echo ""
        echo "NOTE: $install_dir is not in your PATH"
        echo ""
        echo "Add it by adding this line to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
        echo ""
        echo "  export PATH=\"\$PATH:$install_dir\""
        echo ""
    fi
}

verify_installation() {
    local install_dir="$1"
    local script_path="$install_dir/$SCRIPT_NAME"

    if [[ ! -x "$script_path" ]]; then
        log_error "Installation verification failed"
        return 1
    fi

    # Try to get version
    local version
    version=$("$script_path" --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' || echo "unknown")

    log_success "openrouter-launch v$version is ready"
    return 0
}

#######################################
# Main
#######################################

main() {
    echo ""
    echo "openrouter-launch installer"
    echo "==========================="
    echo ""

    # Check dependencies
    if ! command -v curl &>/dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi

    # Determine installation directory
    local install_dir
    install_dir=$(determine_install_dir)

    log_info "Installing to $install_dir"

    # Install
    if ! install_script "$install_dir"; then
        log_error "Installation failed"
        exit 1
    fi

    # Verify
    if ! verify_installation "$install_dir"; then
        exit 1
    fi

    # Check PATH
    check_path "$install_dir"

    echo ""
    echo "Run 'openrouter-launch --help' to get started"
    echo ""
}

main "$@"
