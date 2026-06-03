# lint.sh
#
# Purpose: Shell script linting and formatting (NixOS-aware)
#
# This module provides:
# - shfmt formatting for shell scripts
# - shellcheck static analysis
# - NixOS fallback: tools resolved via PATH, then nix run nixpkgs#PACKAGE
# - Pre-push hook management
#
# shellcheck shell=bash

# Ensure script is sourced, not executed directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
	echo "Error: lint.sh should be sourced, not executed" >&2
	exit 1
fi

# ── Nix detection ───────────────────────────────────────────

# Detect if we're on NixOS
_is_nixos() {
	[[ -f /etc/NIXOS ]] || [[ -d /run/current-system/sw ]]
}

# Detect if Nix is available (nixos, nix on non-nixos, or nix-shell)
_nix_available() {
	command -v nix &>/dev/null
}

# ── Tool resolution (PATH first, then nix fallback) ─────────

# Maps internal tool name → nixpkgs attribute name
declare -A _NIX_PKG_MAP=(
	[shfmt]=shfmt
	[shellcheck]=shellcheck
)

# Resolve a tool: check PATH, then fall back to nix run
# Usage: _resolve_tool TOOL_NAME [NIX_PKG_NAME]
# Sets _TOOL_CMD and _TOOL_NIX to allow calling code to branch.
_resolve_tool() {
	local tool="$1"
	local pkg="${2:-${_NIX_PKG_MAP[$tool]:-$tool}}"

	if command -v "$tool" &>/dev/null; then
		_TOOL_CMD="$tool"
		_TOOL_NIX=false
		return 0
	fi

	if _nix_available; then
		_TOOL_CMD="$tool"
		_TOOL_NIX=true
		_TOOL_PKG="$pkg"
		log_detail "Resolved ${tool} via nix run nixpkgs#${pkg}"
		return 0
	fi

	log_error "${tool} not found on PATH and nix is not available."
	log_detail "Install via your package manager, nixpkgs, or: nix profile install nixpkgs#${pkg}"
	return 1
}

# Run a resolved tool with arguments.
# Handles the difference between direct binary and nix-run invocation.
_run_tool() {
	if [[ "$_TOOL_NIX" == "true" ]]; then
		# nix run expects `--` before tool arguments
		nix run "nixpkgs#${_TOOL_PKG}" -- "$@"
	else
		"$_TOOL_CMD" "$@"
	fi
}

# ── Finding shell scripts ───────────────────────────────────

find_shell_scripts() {
	local root="${1:-.}"
	find "$root" -name "*.sh" -type f 2>/dev/null | grep -v node_modules | grep -v ".git"
}

# ── shfmt ───────────────────────────────────────────────────

run_shfmt() {
	local mode="$1"
	shift
	local files=("$@")

	_resolve_tool shfmt || return 1

	local args=()
	if [[ "$mode" == "check" ]]; then
		args=(-d)
	elif [[ "$mode" == "format" ]]; then
		args=(-w)
	fi

	local failed=0
	for file in "${files[@]}"; do
		if [[ "$mode" == "check" ]]; then
			if ! _run_tool "$_TOOL_CMD" "${args[@]}" "$file" 2>/dev/null; then
				log_warn "Needs formatting: $file"
				((failed++)) || true
			fi
		else
			_run_tool "$_TOOL_CMD" "${args[@]}" "$file" 2>/dev/null && log_detail "Formatted: $file"
		fi
	done

	if [[ $failed -gt 0 ]]; then
		return 1
	fi
	return 0
}

# ── shellcheck ──────────────────────────────────────────────

run_shellcheck() {
	local mode="$1"
	shift
	local files=("$@")

	_resolve_tool shellcheck || return 1

	local failed=0
	for file in "${files[@]}"; do
		if ! _run_tool "$_TOOL_CMD" "$file" 2>/dev/null; then
			log_warn "Issues found in: $file"
			((failed++)) || true
		else
			log_detail "OK: $file"
		fi
	done

	if [[ $failed -gt 0 ]]; then
		return 1
	fi
	return 0
}

# ── Pre-push hook ───────────────────────────────────────────

install_pre_push_hook() {
	local hook_dir="${PROJECT_ROOT}/.git/hooks"
	local hook_file="$hook_dir/pre-push"

	if [[ ! -d "$hook_dir" ]]; then
		log_error "Not a git repository or .git/hooks not found"
		return 1
	fi

	if [[ -f "$hook_file" ]]; then
		if grep -q "dev-conventions lint" "$hook_file" 2>/dev/null; then
			log_info "Pre-push hook already installed"
			return 0
		fi
		log_warn "Existing pre-push hook found. Appending dev-conventions check."
	fi

	local hook_content='
# dev-conventions pre-push check
if command -v dev-conventions &>/dev/null; then
    echo "Running dev-conventions lint..."
    dev-conventions lint --check || {
        echo "Lint check failed. Fix issues before pushing."
        exit 1
    }
fi
'

	if [[ -f "$hook_file" ]]; then
		echo "$hook_content" >>"$hook_file"
	else
		cat >"$hook_file" <<'EOF'
#!/usr/bin/env bash
# Pre-push hook for dev-conventions
EOF
		echo "$hook_content" >>"$hook_file"
		chmod +x "$hook_file"
	fi

	log_info "Installed pre-push hook: $hook_file"
}

remove_pre_push_hook() {
	local hook_file="${PROJECT_ROOT}/.git/hooks/pre-push"

	if [[ ! -f "$hook_file" ]]; then
		log_info "No pre-push hook found"
		return 0
	fi

	if grep -q "dev-conventions lint" "$hook_file" 2>/dev/null; then
		local temp_file
		temp_file=$(mktemp)
		sed '/# dev-conventions pre-push check/,/^fi$/d' "$hook_file" >"$temp_file"

		if [[ $(wc -l <"$temp_file") -le 2 ]]; then
			rm -f "$hook_file"
			log_info "Removed pre-push hook (was only dev-conventions)"
		else
			mv "$temp_file" "$hook_file"
			log_info "Removed dev-conventions section from pre-push hook"
		fi
		rm -f "$temp_file"
	else
		log_info "Pre-push hook exists but not managed by dev-conventions"
	fi
}

# ── Main lint command ───────────────────────────────────────

cmd_lint() {
	local mode="check"
	local files=()
	local install_hook=false
	local remove_hook=false
	local check_context=false
	local install_context_hook=false
	local remove_context_hook=false

	while [[ $# -gt 0 ]]; do
		case "$1" in
		--format | -f)
			mode="format"
			shift
			;;
		--check | -c | --quick | -q)
			mode="check"
			shift
			;;
		--fix)
			mode="fix"
			shift
			;;
		--files)
			IFS=',' read -ra files <<<"$2"
			shift 2
			;;
		--install-hook)
			install_hook=true
			shift
			;;
		--remove-hook)
			remove_hook=true
			shift
			;;
		--context)
			check_context=true
			shift
			;;
		--install-context-hook)
			install_context_hook=true
			shift
			;;
		--remove-context-hook)
			remove_context_hook=true
			shift
			;;
		--yes | -y)
			# shellcheck disable=SC2034
			SKIP_CONFIRM=true
			shift
			;;
		*)
			log_error "Unknown option: $1"
			return 1
			;;
		esac
	done

	_LINT_SH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
	if [[ -f "${_LINT_SH_DIR}/check-context.sh" ]]; then
		# shellcheck disable=SC1091
		source "${_LINT_SH_DIR}/check-context.sh"
	fi

	if [[ "$install_hook" == "true" ]]; then
		install_pre_push_hook
		return $?
	fi

	if [[ "$remove_hook" == "true" ]]; then
		remove_pre_push_hook
		return $?
	fi

	if [[ "$install_context_hook" == "true" ]]; then
		install_context_hook
		return $?
	fi

	if [[ "$remove_context_hook" == "true" ]]; then
		remove_context_hook
		return $?
	fi

	if [[ "$check_context" == "true" ]]; then
		if declare -f check_context_drift &>/dev/null; then
			log_info "Checking context.md files..."
			echo ""
			check_context_drift "$PROJECT_ROOT"
			return $?
		else
			log_error "check-context.sh not found"
			return 1
		fi
	fi

	if [[ ${#files[@]} -eq 0 ]]; then
		mapfile -t files < <(find_shell_scripts "$PROJECT_ROOT")
	fi

	if [[ ${#files[@]} -eq 0 ]]; then
		log_warn "No shell scripts found in $PROJECT_ROOT"
		return 0
	fi

	log_info "Found ${#files[@]} shell script(s)"
	if _is_nixos; then
		log_detail "NixOS detected — tools resolved via PATH, then nix run nixpkgs#PACKAGE"
	fi
	echo ""

	local shfmt_failed=0
	local shellcheck_failed=0

	log_info "Running shfmt ($mode)..."
	if ! run_shfmt "$mode" "${files[@]}"; then
		shfmt_failed=1
	fi
	echo ""

	log_info "Running shellcheck..."
	if ! run_shellcheck "$mode" "${files[@]}"; then
		shellcheck_failed=1
	fi
	echo ""

	if [[ $shfmt_failed -eq 0 && $shellcheck_failed -eq 0 ]]; then
		log_success "All checks passed"
		return 0
	else
		log_warn "Some checks failed"
		if [[ $shfmt_failed -eq 1 ]]; then
			log_detail "shfmt: run with --format to fix"
		fi
		if [[ $shellcheck_failed -eq 1 ]]; then
			log_detail "shellcheck: fix issues manually"
		fi
		return 1
	fi
}
