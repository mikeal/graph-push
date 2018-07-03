const links = require('dag-cbor-links')
const http = require('http')
const websocket = require('websocket-stream')
const znode = require('znode')
const CID = require('cids')
const Block = require('ipfs-block')

class GraphPusher {
  constructor (options) {
    this.has = options.has
    this._put = options.put

    if (typeof options.server === 'undefined') options.server = true
    if (options.server !== false) {
      let server
      if (options.server === true) server = http.createServer()
      else server = options.server
      this.onServer(server)
    }
  }
  async put (cid, buffer) {
    // TODO: verify cid hash to buffer
    return this._put(cid, buffer)
  }
  async pullGraph (client, buffer) {
    let getcid = async cid => {
      let has = await this.has(cid)
      if (has) return 0
      let buffer = await client.get(cid.toBaseEncodedString())
      await this.put(cid, buffer)
      if (cid.codec === 'dag-cbor') {
        return this.pullGraph(client, buffer)
      } else {
        return 1
      }
    }

    let promises = []
    for (let [, cid] of links(buffer)) {
      promises.push(getcid(cid))
    }
    return (await Promise.all(promises)).reduce((x, y) => x + y, 0)
  }
  async onStream (stream) {
    let client
    let pullGraph = async (cid, buffer) => {
      cid = new CID(cid)
      let count = await this.pullGraph(await client, buffer)
      await this.put(cid, buffer)
      if (this.onDeploy) {
        this.onDeploy(new Block(buffer, cid), count)
      }
      return count
    }
    client = znode(stream, {pullGraph})
  }
  onServer (server) {
    let _onStream = (...args) => this.onStream(...args)
    this.ws = websocket.createServer({
      perMessageDeflate: false,
      server: server
    }, _onStream)

    this.listen = (...args) => server.listen(...args)
    this.close = (...args) => server.close(...args)
  }
}

module.exports = (...args) => new GraphPusher(...args)
