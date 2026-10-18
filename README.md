# InstaFix

**Make Instagram Reels playable directly in Discord.**

InstaFix is a Cloudflare Worker that generates video embeds for Instagram posts and Reels, allowing supported platforms such as Discord to display playable media previews.

## Features

- Instagram Reel and post URL support
- Open Graph metadata for video previews
- Video streaming through a Cloudflare Worker
- Custom domain support
- Self-hosting with Cloudflare Workers

## Usage

Replace the Instagram domain with your InstaFix domain.

**Original URL:**

```text
https://www.instagram.com/reel/ABC123/
```

**InstaFix URL:**

```text
https://instagfix.com/reel/ABC123/
```

Replace `ABC123` with the shortcode of the Instagram post or Reel.

## Self-hosting

### Requirements

- [Node.js](https://nodejs.org/)
- A [Cloudflare account](https://dash.cloudflare.com/)
- Wrangler CLI

### 1. Clone the repository

```bash
git clone https://github.com/konojohny/instafix.git
cd instafix
```

### 2. Install dependencies

```bash
npm install
```

### 3. Authenticate with Cloudflare

```bash
npx wrangler login
```

### 4. Run locally

```bash
npm run dev
```

### 5. Deploy

```bash
npm run deploy
```

Configure your custom domain through the Cloudflare dashboard if you want to use a domain other than the default `workers.dev` address.

## Development

Run the test suite with:

```bash
npm test
```

## Limitations

- Instagram may change its internal APIs or page structure, which can affect media extraction.
- Availability and playback depend on Instagram access, Cloudflare Worker limits, and the platform rendering the embed.
- Private posts and media requiring authentication may not be accessible.

## Disclaimer

InstaFix is an independent project and is not affiliated with, endorsed by, or sponsored by Instagram or Meta.

Use this project responsibly and respect the rights and privacy of content owners.

## Credits

This project is based on code from [inkitori/igembed](https://github.com/inkitori/igembed). Please refer to the original repository for its licensing terms and attribution requirements.
