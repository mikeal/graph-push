const websocket = require('websocket-stream')
const znode = require('znode')
const CID = require('cids')

module.exports = async (url, block, get) => {
  let stream = websocket(url)
  let rpc = { get: cid => get(new CID(cid)) }
  let client = await znode(stream, rpc)
  let cid = block.cid.toBaseEncodedString()
  let result = await client.pullGraph(cid, block.data)

  /* close the websocket client */
  stream.end()

  result.pushed = result.fetched + 1

  return result
}
