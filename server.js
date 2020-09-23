// server.js
// where your node app starts

// we've started you off with Express (https://expressjs.com/)
// but feel free to use whatever libraries or frameworks you'd like through `package.json`.
const express = require("express");
const fetch   = require('node-fetch');
const fileType = require('file-type')
const SemVer = require('semver/classes/semver')

const app = express();

// make all the files in 'public' available
// https://expressjs.com/en/starter/static-files.html
// app.use(express.static("public"));

// https://expressjs.com/en/starter/basic-routing.html
app.get("/", (request, response) => {
  response.write('nothing to see here');
});

// app.enable('etag')

app.get('/r', async function(req, res) {
  const repoUrl = req.query.repo //"https://github.com/edgexfoundry/edgex-global-pipelines.git"
  if(repoUrl) {
	  const semver = await getVersion(repoUrl)
    const version = semver.version
    
    console.log(version);
    
    /*const shield = getShield(version)
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
    
    // Redirect example
    const shieldUrl = `https://img.shields.io/static/v1?label=version&message=v${version}&color=success?cacheSeconds=60`
    res.setHeader('Cache-Control', 'no-cache');
    res.redirect(301, shieldUrl);
  } else {
    pixel(res)
  }
});

function pixel(res) {
  const buf = new Buffer(43);
  buf.write("R0lGODlhAQABAIAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==", "base64");
  res.send(buf, { 'Content-Type': 'image/gif' }, 200);
}

async function getShield(version) {
  const shieldUrl = `https://img.shields.io/static/v1?label=version&message=v${version}&color=success?cacheSeconds=60`
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

async function getVersion(repoUrl) {
  const repo = new URL(repoUrl);
  const cleanPath = repo.pathname.replace('.git', '');
  const baseUrl = `https://raw.githubusercontent.com${cleanPath}/semver/master`

  let version;
  try {
    const rawVersion = await fetch(baseUrl);
    const v = await rawVersion.text();
    version = new SemVer(v);
    //version = new SemVer('1.2.3')

    // decrement to get "real" version
    if(version.prerelease.length) {
      const preVersion = parseInt(version.prerelease[version.prerelease.length-1])
      if(preVersion > 0) {
        const newPreVersion = preVersion - 1
        console.log(`newPreVersion: ${newPreVersion}`)
        version.prerelease[version.prerelease.length-1] = newPreVersion
      }
    } else {
      version.patch = version.patch - 1
    }
    version.format()
  } catch(err) {
    console.err(err);
  }
  
  return version
}

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
