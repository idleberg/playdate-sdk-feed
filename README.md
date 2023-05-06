# 🕹 playdate-sdk-feed

> The missing feed for Playdate SDK updates.

[![Build](https://img.shields.io/github/actions/workflow/status/idleberg/playdate-sdk-feed/gh-pages.yml?style=for-the-badge)](https://github.com/idleberg/playdate-sdk-feed/actions)

The feed is available in these flavours:

- `https://idleberg.github.io/playdate-sdk-feed/feed.atom`
- `https://idleberg.github.io/playdate-sdk-feed/feed.json`
- `https://idleberg.github.io/playdate-sdk-feed/feed.rss`

## Self-hosted

In order to host the feed yourself, please follow these steps:

```sh
# fork repository
git clone https://github.com/idleberg/playdate-sdk-feed

# install dependencies
cd playdate-sdk-feed && pnpm install

# build feeds
pnpm run build
```

You can now deploy the files inside the `public`-folder to your webspace.

## Related

[Install the Playdate SDK using a package manager](https://gist.github.com/idleberg/e246f7a582ac173d156c60ec23ce2af0)
