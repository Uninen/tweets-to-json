Save your tweets into a JSON file using Twitter API. You can run it programatically (for example with GitLab or GitHub CI) to automatically keep a JSON archive of your tweets.

This was originally built for an easy way to provide external data to Hugo data templates.

Note: this script is not intended for huge datasets, it handles all tweets in memory. According to [user_timeline docs](https://developer.twitter.com/en/docs/twitter-api/v1/tweets/timelines/api-reference/get-statuses-user_timeline) it "can only return up to 3,200 of a user's most recent Tweets". YMMV. Read also [about Twitter's rate limits](https://developer.twitter.com/en/docs/rate-limits).

## Configuration

1. Get `Bearer token` key for your app from [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard) and add it to `TWITTER_BEARER_TOKEN` environment variable (or to `.env` file in the root of your project)
2. Create `tweets-to-json-config.js` with `searchParams` and `exportFn` (see example below)

## Usage

When you run `tweets-to-json` first time, a `tweets.json` file (can be overrided) is created in the same directory and all your tweets are saved into it. Subsequent invocations will check the file, take the latest tweets ID, and only query for tweets after that ID. The tweets are saved in order, latest tweet first.

With `yarn` or `npm`:

`yarn tweets-to-json -h`

```
Usage: tweets-to-json [options]

Options:
  -o, --output-file <filepath>  specify where to output the tweets (default: "./tweets.json")
  -V, --version                 output the version number
  -h, --help                    display help for command
```

## Example configuration

Full example of `tweets-to-json.config.js`:

```js
const dayjs = require('dayjs')

module.exports = {
  searchParams: {
    screen_name: 'uninen',
    exclude_replies: true,
    trim_user: true,
    tweet_mode: 'extended',
    count: 100,
  },
  exportFn: (result) => {
    const tags = []
    const mentions = []
    const media = []
    const urls = []

    if (result.entities.hashtags && result.entities.hashtags.length > 0) {
      for (const tag of result.entities.hashtags) {
        tags.push(tag.text)
      }
    }
    if (
      result.entities.user_mentions &&
      result.entities.user_mentions.length > 0
    ) {
      for (const user of result.entities.user_mentions) {
        mentions.push(user.screen_name)
      }
    }
    if (result.entities.media && result.entities.media.length > 0) {
      for (const obj of result.entities.media) {
        media.push({
          url: obj.media_url_https,
          tco_url: obj.url,
        })
      }
    }
    if (result.entities.urls && result.entities.urls.length > 0) {
      for (const url of result.entities.urls) {
        urls.push({
          tco_url: url.url,
          url: url.expanded_url,
        })
      }
    }

    return {
      id: result.id_str,
      text: result.full_text,
      urls: urls,
      tags: tags,
      media: media,
      mentions: mentions,
      timestamp: dayjs(result.created_at).unix(),
    }
  },
}
```

## Contributing

All contributions are welcome! Please follow the [code of conduct](https://www.contributor-covenant.org/version/2/0/code_of_conduct/) when interacting with others.

[This project lives on GitLab](https://gitlab.com/uninen/tweets-to-json) and is mirrored on GitHub.

[Follow @Uninen](https://twitter.com/uninen) on Twitter.
