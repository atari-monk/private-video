### Terminal 1

```bash
cd ~/atari-monk/project/private-video
./scripts/dev.sh
```

### Terminal 2

```bash
cloudflared tunnel --url http://localhost:3000
```

### Browser

```text
https://atari-monk.github.io/private-video/
```