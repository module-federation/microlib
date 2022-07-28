'use strict'

require('dotenv').config()
require('regenerator-runtime')
const importFresh = require('import-fresh')
const express = require('express')
const server = require('./server')
const app = express()
const { passportAuth, protectAuthRoutes } = require('./auth/passport') // untested - hold commit

function clearRoutes() {
  app._router.stack = app._router.stack.filter(
    k => !(k && k.route && k.route.path)
  )
}

async function load(aegis = null) {
  if (aegis) {
    await aegis.dispose()
    clearRoutes()
  }

  const remote = importFresh('../dist/remoteEntry.js')
  return remote.get('./hostContainer').then(async factory => {
    const aegis = factory()
    const remotes = (await remote.get('./remoteEntries'))()
    const handle = await aegis.init(remotes)

    app.use(express.json())
    app.use(express.static('public'))

    passportAuth(app); // initialize passport auth - untested hold commit

    app.use('/reload', async (req, res) => {
      await load(aegis)
      res.send('<h1>reload complete</h1><a href="/">back</a>')
    })

    // protectAuthRoutes is configured to open routes that it deems ok - all others are protected
    app.all('*', protectAuthRoutes, (req, res) => handle(req.path, req.method, req, res)) //  - untested hold commit
  })
}

load().then(() => server.start(app))
