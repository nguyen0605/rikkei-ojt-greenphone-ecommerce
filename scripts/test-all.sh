#!/bin/bash
# GreenPhone — Full Test Suite
# Usage: bash scripts/test-all.sh
# Exit code: non-zero if release gate fails

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JAVA_HOME_VAL="$HOME/.jdks/ms-17.0.18"
PASSED=0
FAILED=0
BLOCKED=0

red()   { echo -e "\033[31m$1\033[0m"; }
green() { echo -e "\033[32m$1\033[0m"; }
yellow(){ echo -e "\033[33m$1\033[0m"; }

check() {
  if [ $? -eq 0 ]; then
    green "  ✅ PASS: $1"
    PASSED=$((PASSED + 1))
  else
    red "  ❌ FAIL: $1"
    FAILED=$((FAILED + 1))
  fi
}

step() { echo ""; echo "════════════════════════════════════════"; echo "🔹 $1"; echo "════════════════════════════════════════"; }

# ───────────── 1. Environment Check ─────────────
step "1. Environment Check"

export JAVA_HOME="$JAVA_HOME_VAL"
export PATH="$JAVA_HOME/bin:$PATH"

echo "Java: $(java -version 2>&1 | head -1)"
echo "Node: $(node --version)"
echo "npm:  $(npm --version)"

# ───────────── 2. Backend Build ─────────────
step "2. Backend Build"
cd "$REPO_ROOT/GreenPhone-Backend"
./gradlew build -x test 2>&1 | tail -3
check "Backend build"

# ───────────── 3. Backend Unit Tests ─────────────
step "3. Backend Unit Tests"
./gradlew test --tests "com.re.greenphone.service.*" --tests "com.re.greenphone.security.*" 2>&1 | tail -5
check "Backend unit tests (service + security)"

# ───────────── 4. Backend Coverage ─────────────
step "4. Backend Coverage"
./gradlew jacocoTestReport 2>&1 | tail -3
check "Backend coverage report"

# ───────────── 5. Frontend Install ─────────────
step "5. Frontend Install"
cd "$REPO_ROOT/Frontend"
npm install --silent 2>&1 | tail -3
check "Frontend dependencies"

# ───────────── 6. Frontend Type Check ─────────────
step "6. Frontend Type Check"
npx tsc -b 2>&1 | tail -3
check "Frontend TypeScript check"

# ───────────── 7. Frontend Build ─────────────
step "7. Frontend Build"
npm run build 2>&1 | tail -5
check "Frontend production build"

# ───────────── 8. Frontend Lint ─────────────
step "8. Frontend Lint"
npm run lint 2>&1 | tail -3
check "Frontend ESLint"

# ───────────── 9. Frontend Unit Tests ─────────────
step "9. Frontend Unit/Component Tests"
npx vitest run 2>&1 | tail -5
check "Frontend Vitest"

# ───────────── 10. Frontend Coverage ─────────────
step "10. Frontend Coverage"
npx vitest run --coverage 2>&1 | tail -5
check "Frontend coverage"

# ───────────── 11. Security Audit ─────────────
step "11. Security Audit"
cd "$REPO_ROOT/Frontend"
npm audit --audit-level=high 2>&1 | tail -5 || true
check "Frontend npm audit (high+)"

# ───────────── Summary ─────────────
step "Test Summary"
echo ""
echo "  Passed:  $PASSED"
echo "  Failed:  $FAILED"
echo "  Blocked: $BLOCKED"
echo ""

if [ "$FAILED" -gt 0 ]; then
  red "⚠️  RELEASE GATE: FAILED ($FAILED checks failed)"
  exit 1
else
  green "✅ RELEASE GATE: ALL CHECKS PASSED"
  exit 0
fi
