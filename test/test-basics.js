const {test} = require('tap')
const server = require('../src/server')
const client = require('../src/client')
const Block = require('ipfs-block')
const cbor = require('dag-cbor-sync')(1e+6)
const multihashes = require('multihashes')
const crypto = require('crypto')
const CID = require('cids')

const sha2 = b => crypto.createHash('sha256').update(b).digest()

const asBlock = (buffer, type) => {
  let hash = multihashes.encode(sha2(buffer), 'sha2-256')
  let cid = new CID(1, type, hash)
  return new Block(buffer, cid)
}

let PORT = 8765

const mkopts = db => {
  return {
    get: async cid => {
      cid = cid.toBaseEncodedString()
      return db.get(cid) || null
    },
    has: async cid => {
      cid = cid.toBaseEncodedString()
      return db.has(cid)
    },
    put: async (cid, buffer) => {
      cid = cid.toBaseEncodedString()
      db.set(cid, buffer)
    }
  }
}

const gptest = (str, handler) => {
  let db = new Map()
  let _server = server(mkopts(db))
  _server.db = db
  PORT++
  let url = `ws://localhost:${PORT}`
  _server.listen(PORT, async () => {
    await test(str, t => handler(t, url, db))
    _server.close()
  })
}

gptest('basics: push only root', async (t, url, db) => {
  let map = new Map()
  let buffer = cbor.serialize({})
  let block = asBlock(buffer, 'dag-cbor')
  let ret = await client(url, block, mkopts(map).get)
  t.same(ret, {pushed: 1})
  t.same(db.get(block.cid.toBaseEncodedString()), buffer)
})

gptest('basics: deep graph', async (t, url, db) => {
  let map = new Map()

  let mkblock = obj => {
    let buffer = cbor.serialize(obj)
    let block = asBlock(buffer, 'dag-cbor')
    return block
  }

  let test = 0
  let root = {test, links: []}
  while (test < 100) {
    test++
    let x = 0
    let branch = {test, links: []}
    while (x < 5) {
      x++
      let block = asBlock(Buffer.from(test + ' ' + x), 'raw')
      map.set(block.cid.toBaseEncodedString(), block.data)
      branch.links.push({'/': block.cid.toBaseEncodedString()})
    }
    let block = mkblock(branch)
    map.set(block.cid.toBaseEncodedString(), block.data)
    root.links.push({'/': block.cid.toBaseEncodedString()})
  }
  let block = mkblock(root)
  map.set(block.cid.toBaseEncodedString(), block.data)
  let ret = await client(url, block, mkopts(map).get)
  t.same(ret, {pushed: 501})
})
