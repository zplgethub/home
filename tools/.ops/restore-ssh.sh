#!/usr/bin/env bash
set -euo pipefail
D="$(cd -- "$(dirname -- "$0")" && pwd)"
mkdir -p ~/.ssh && cp -f "$D/id_ed25519" ~/.ssh/id_ed25519 && chmod 600 ~/.ssh/id_ed25519
printf 'Host hw\n  HostName 139.9.201.219\n  Port 22222\n  User zzz\n  IdentityFile ~/.ssh/id_ed25519\n  StrictHostKeyChecking no\n  ProxyCommand nc -X connect -x 127.0.0.1:18080 %%h %%p\n' > ~/.ssh/config
chmod 600 ~/.ssh/config && echo 已恢复
