// server.js
// where your node app starts

// we've started you off with Express (https://expressjs.com/)
// but feel free to use whatever libraries or frameworks you'd like through `package.json`.
const express = require("express")
const fetch   = require('node-fetch')
// const fileType = require('file-type')
const SemVer = require('semver/classes/semver')
const { Octokit } = require("@octokit/rest")

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
  userAgent: 'edgexfoundry/version-shield v1.0.0'
})

const app = express()

// make all the files in 'public' available
// https://expressjs.com/en/starter/static-files.html
// app.use(express.static("public"));

// https://expressjs.com/en/starter/basic-routing.html
app.get("/", (req, res) => {
  const shieldUrl = `https://img.shields.io/static/v1?logo=github&label=created%20by&message=%40ernestojeda&color=blue`
  res.setHeader('Cache-Control', 'no-cache')
  res.redirect(301, shieldUrl)
})

// app.enable('etag')

app.get('/t', async function(req, res) {
  const repoUrl = req.query.repo //"https://github.com/edgexfoundry/edgex-global-pipelines.git"
  const namedTag = req.query.tag // stable

  const versionInfo = await getNamedTagVersion(repoUrl, namedTag)
  if(versionInfo) {
    const { version } = versionInfo
    redirectVersionShield(version, namedTag, res)
  }
  else {
    pixel(res)
  }
})

app.get('/r', async function(req, res) {
  const repoUrl = req.query.repo //"https://github.com/edgexfoundry/edgex-global-pipelines.git"
  if(repoUrl) {
    const semver = await getSemverVersion(repoUrl)
    const {version} = semver

    redirectVersionShield(version, 'version', res)

    // Download in memeory and send pixel buffer...not working yet
    /*const shield = downloadShield(version)
    if(shield) {
      const options = {
        headers: {
          'x-timestamp': Date.now(),
          'x-sent': true,
          //'Content-Type': 'image/svg+xml;charset=utf-8',
          'Content-Type': 'image/gif',
          'Cache-Control': 'no-cache'
        }
      }
      res.setHeader('Content-Type', 'image/svg+xml;charset=utf-8',)
      res.send(shield);
    } else {
      console.log('there')
      pixel(res)
    }*/
  } else {
    pixel(res)
  }
})

function redirectVersionShield(version, label = 'version', res) {
  const shieldUrl = `https://img.shields.io/static/v1?label=${label}&message=v${version}&color=success&cacheSeconds=60`
  res.setHeader('Cache-Control', 'no-cache')
  res.redirect(301, shieldUrl)
}

function pixel(res) {
  const buf = Buffer.alloc(43);
  buf.write("R0lGODlhAQABAIAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==", "base64");
  res.send(buf, { 'Content-Type': 'image/gif' }, 200);
}

async function downloadShield(version) {
  const shieldUrl = `https://img.shields.io/static/v1?label=version&message=v${version}&color=success&cacheSeconds=60`
  //const shieldUrl = `https://img.shields.io/badge/version-v${version}-brightgreen`
  console.log(`Fetching: ${shieldUrl}`)
  
  const response = await fetch(shieldUrl)
  
	if(response.ok) {
    const buffer = await response.buffer()
    console.log(buffer)
    // const type = fileType.fromBuffer(buffer)
    // console.log(await type)
    return buffer  
  }
  
}

async function getSemverVersion(repoUrl) {
  const repo = new URL(repoUrl)
  const cleanPath = repo.pathname.replace('.git', '')

  console.log(`Getting version info for: ${repoUrl}`)

  const baseUrl = `https://raw.githubusercontent.com${cleanPath}/semver/master`

  let version;
  try {
    const rawVersion = await fetch(baseUrl)
    const v = await rawVersion.text()
    version = new SemVer(v)
    console.log(`Raw version from semver/master file: ${version}`)
    //version = new SemVer('1.2.3')

    // decrement to get "real" version
    if(version.prerelease.length) {
      const preVersion = parseInt(version.prerelease[version.prerelease.length-1])
      if(preVersion > 0) {
        const newPreVersion = preVersion - 1
        //console.log(`newPreVersion: ${newPreVersion}`)
        version.prerelease[version.prerelease.length-1] = newPreVersion
      }
    } else {
      version.patch = version.patch - 1
    }
    version.format()
    console.log(`Final version: ${version}`);
  } catch(err) {
    console.err(err);
  }
  
  return version
}

async function getNamedTagVersion(repoUrl, namedTag) {
  if(!repoUrl && (!namedTag && namedTag === '')) {
    return
  }

  const repo = new URL(repoUrl)
  const cleanPath = repo.pathname.replace('.git', '')
  const pathSplit = cleanPath.split('/').filter(el => el.length > 0)

  let version
  // this is the only valid case
  if(pathSplit.length == 2) {
    const [owner, repo] = pathSplit

    try {
      const {data: tags, status} = await octokit.repos.listTags({
        owner,
        repo,
        per_page: 100
      })

      if(status == 200 && tags) {
        const namedTagRef = tags.find(tag => tag.name === namedTag)

        if(namedTagRef) {
          console.log(`Found named tag info for [${namedTag}] sha [${namedTagRef.commit.sha}]`)

          // We should have a version tag with the same commit as the namedTag
          const versionTag = tags.find(tag => tag.commit.sha === namedTagRef.commit.sha)
          if(versionTag) {
            console.log(`Found a corresponding version tag for [${namedTag}] => ${versionTag.name}`)
            version = { version: versionTag.name.replace('v', ''), sha: versionTag.commit.sha }
          }
        }
      }
    } catch (error) {
      console.error(error)
      // if tags and version are not found ignore
    }
  }

  return version
}

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
