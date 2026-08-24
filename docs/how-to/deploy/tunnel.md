Great. Now **only do the Cloudflare Tunnel part**. Don't change your frontend yet.

The goal is:

```text
Internet
   ↓
https://something.trycloudflare.com
   ↓
your PC
   ↓
localhost:3000
```

This is free and temporary, which is exactly what we want for the test.

## Step 1 — Make sure your local app is running

Terminal 1:

```bash
cd ~/atari-monk/project/private-video
./scripts/dev.sh
```

You should have:

```text
Serving HTTP on 0.0.0.0 port 8080
```

and:

```text
Signaling server listening on port 3000
```

**Leave this terminal running.**

---

## Step 2 — Install `cloudflared`

Open a **second terminal**.

Run:

```bash
cd /tmp
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
```

Then:

```bash
sudo dpkg -i cloudflared-linux-amd64.deb
```

Check that it installed:

```bash
cloudflared --version
```

You should see a version number.

---

## Step 3 — Start the free tunnel

In that same second terminal:

```bash
cloudflared tunnel --url http://localhost:3000
```

Wait a few seconds.

You should see something similar to:

```text
Your quick Tunnel has been created! Visit it at:

https://some-random-name.trycloudflare.com
```

Your URL will obviously be different.

### Important

**Keep this terminal open.**

The tunnel exists only while this command is running.

---

## Step 4 — Test the tunnel

Take the URL Cloudflare gave you.

For example:

```text
https://some-random-name.trycloudflare.com
```

Open:

```text
https://some-random-name.trycloudflare.com/api/ice
```

in your browser.

You should get JSON from your Node server.

Something along the lines of:

```json
{
  "iceServers": [
    {
      "urls": "stun:stun.l.google.com:19302"
    }
  ]
}
```

If you get that, we have successfully done:

```text
PUBLIC INTERNET
      ↓
  Cloudflare
      ↓
  your PC
      ↓
 Node :3000
```

### Stop here.

**Don't change `frontend/index.html` yet.**

Tell me what you get when you open:

```text
https://YOUR-TRY-CLOUDFLARE-URL/api/ice
```

If it returns the JSON, I'll give you the **next single step: connecting your GitHub Pages frontend to that tunnel**.
