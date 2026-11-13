#!/usr/bin/env bash
set -euo pipefail

JENKINS_ENV_FILE="${JENKINS_ENV_FILE:-.env}"

# Read only Jenkins settings from the optional project environment file.
read_env_value() {
  local key="$1"
  local value

  value="$(sed -n "s/^[[:space:]]*${key}[[:space:]]*=[[:space:]]*//p" "${JENKINS_ENV_FILE}" | tail -n 1)"
  value="${value%%#*}"
  value="${value##+([[:space:]])}"
  value="${value%%+([[:space:]])}"
  printf '%s' "${value}"
}

if [[ -f "${JENKINS_ENV_FILE}" ]]; then
  # extglob is required for trimming optional whitespace around values.
  shopt -s extglob
  JENKINS_USER="${JENKINS_USER:-$(read_env_value JENKINS_USER)}"
  JENKINS_HOME="${JENKINS_HOME:-$(read_env_value JENKINS_HOME)}"
  JENKINS_PIPELINE_NAME="${JENKINS_PIPELINE_NAME:-$(read_env_value JENKINS_PIPELINE_NAME)}"
  JENKINS_WORKSPACE_DIR="${JENKINS_WORKSPACE_DIR:-$(read_env_value JENKINS_WORKSPACE_DIR)}"
fi

JENKINS_USER="${JENKINS_USER:-jenkins}"
JENKINS_HOME="${JENKINS_HOME:-/var/lib/jenkins}"
JENKINS_PIPELINE_NAME="${1:-${JENKINS_PIPELINE_NAME:-project-pipeline}}"
if [[ -n "${1:-}" ]]; then
  WORKSPACE_DIR="${JENKINS_HOME}/workspace/${JENKINS_PIPELINE_NAME}"
else
  WORKSPACE_DIR="${JENKINS_WORKSPACE_DIR:-${JENKINS_HOME}/workspace/${JENKINS_PIPELINE_NAME}}"
fi

die() { echo "ERROR: $*" >&2; exit 1; }

# Must run as root
if [[ "${EUID}" -ne 0 ]]; then
  die "Run this script as root (e.g., sudo $0)."
fi

echo "== Checking Jenkins user =="
id "${JENKINS_USER}" >/dev/null 2>&1 || die "User '${JENKINS_USER}' does not exist."

echo "== Fixing workspace permissions =="
mkdir -p "${WORKSPACE_DIR}"

# Give Jenkins ownership of its home (includes workspace)
chown -R "${JENKINS_USER}:${JENKINS_USER}" "${JENKINS_HOME}"

# Reasonable default perms (optional but commonly used)
find "${JENKINS_HOME}" -type d -exec chmod 755 {} \;
find "${JENKINS_HOME}" -type f -exec chmod 644 {} \;

echo "== Ensuring Docker is installed and running =="
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker not found. Attempting install..."
  if [[ -r /etc/os-release ]]; then
    . /etc/os-release
    case "${ID_LIKE:-$ID}" in
      *debian*|*ubuntu*)
        apt-get update
        apt-get install -y docker.io
        ;;
      *rhel*|*fedora*|*centos*)
        # Best-effort (repo availability depends on distro)
        if command -v dnf >/dev/null 2>&1; then
          dnf install -y docker
        else
          yum install -y docker
        fi
        ;;
      *)
        die "Unsupported distro for auto-install. Install Docker manually, then re-run."
        ;;
    esac
  else
    die "Cannot detect OS to install Docker. Install Docker manually, then re-run."
  fi
fi

# Start/enable docker (systemd)
if command -v systemctl >/dev/null 2>&1; then
  systemctl enable --now docker || true
else
  die "systemctl not found. Start Docker manually, then re-run."
fi

echo "== Allowing Jenkins to run Docker (docker group) =="
getent group docker >/dev/null 2>&1 || groupadd docker
usermod -aG docker "${JENKINS_USER}"

echo "== Restarting Jenkins to pick up new group membership =="
systemctl restart jenkins || true

echo "== Verifying Docker access as Jenkins user =="
if sudo -u "${JENKINS_USER}" docker ps >/dev/null 2>&1; then
  echo "SUCCESS: Jenkins user can run Docker."
else
  echo "WARNING: Jenkins user cannot run Docker yet."
  echo "Check: ls -l /var/run/docker.sock"
  echo "You may need to reboot or ensure Jenkins service restarted correctly."
  exit 2
fi

echo "Done."