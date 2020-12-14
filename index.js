const Twitter = require('twitter-lite')
const fs = require('fs/promises')
const dotenv = require('dotenv')
const { Command } = require('commander')
const R = require('rambda')
const { cosmiconfig } = require('cosmiconfig')

if (!process.env.TWITTER_BEARER_TOKEN) {
  console.error('Error: TWITTER_BEARER_TOKEN environment variable not set.')
  process.exit(1)
}

let tweets = []
let lastId = null
let prevLastId = null
let sinceId = null
let tweetsAtStart = 0

const explorer = cosmiconfig('tweets-to-json')
const program = new Command()
const client = new Twitter({
  extension: true,
  bearer_token: process.env.TWITTER_BEARER_TOKEN,
})

dotenv.config()
program
  .option(
    '-o, --output-file <filepath>',
    'specify where to output the tweets',
    './tweets.json'
  )
  .version('0.0.1')
  .parse(process.argv)

async function queryTwitter(searchParams, last_id = null, since_id = null) {
  if (last_id) {
    searchParams.max_id = last_id
  }
  if (since_id) {
    searchParams.since_id = since_id
  }
  return await client.get('statuses/user_timeline', searchParams)
}

async function fetchTweets(searchParams, exportFn) {
  console.log(`Fetching tweets for @${searchParams.screen_name}`)

  try {
    const contents = await fs.readFile(program.outputFile, { encoding: 'utf8' })
    tweets = JSON.parse(contents)
    sinceId = tweets[tweets.length - 1].id
    tweetsAtStart = tweets.length
    console.log(`✓ Found existing file with ${tweetsAtStart} tweets.`)
  } catch (err) {
    sinceId = null
    console.log('No existing file found, fetching all tweets.')
    tweetsAtStart = 0
  }

  process.stdout.write('Searching: ')

  while (true) {
    let results = []
    process.stdout.write('.')

    try {
      results = await queryTwitter(searchParams, lastId, sinceId)
    } catch (err) {
      console.error(err)
    }

    if (results && results.length > 0) {
      for (const result of results) {
        tweets.push(exportFn(result))
        lastId = result.id_str
      }
      if (prevLastId === lastId) {
        break
      } else {
        prevLastId = lastId
      }
    } else {
      break
    }
  }

  const uniqFn = (x, y) => x.id === y.id
  const sortFn = (x) => x.timestamp
  const finalTweets = R.sortBy(sortFn, R.uniqWith(uniqFn, tweets))
  console.log('')
  process.stdout.write('Done. ')
  if (tweetsAtStart > 0) {
    const diff = finalTweets.length - tweetsAtStart
    let plural = 's'
    if (diff === 1) {
      plural = ''
    }
    if (diff > 0) {
      process.stdout.write(`${diff} new tweet${plural} added.\n`)
    } else {
      process.stdout.write(`No new tweets found.\n`)
    }
  } else {
    process.stdout.write(`Found ${finalTweets.length} tweets.\n`)
  }
  await fs.writeFile(program.outputFile, JSON.stringify(finalTweets, null, 2))
}

explorer
  .search()
  .then((result) => {
    if (result.config.searchParams && result.config.exportFn) {
      fetchTweets(result.config.searchParams, result.config.exportFn).then(
        () => {
          console.log('')
        }
      )
    } else {
      console.error('Error: searchParams or exportFn not found in config')
      process.exit(1)
    }
  })
  .catch((error) => {
    console.error('Error: configuration file not found or malformed.')
    console.error(error)
    process.exit(1)
  })
