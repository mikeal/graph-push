# Graph Push

Efficiently push an IPLD graph to a server over websockets.

Only supports `dag-cbor` graph traversal.

Usage:

```javascript
const {client, server} = require('graph-push')

let toString = cid => cid.toBaseEncodedString()

/* simple in-memory database */
let db = new Map()
let get = async cid => {
  return db.get(toString(cid))
}
let has = async cid => {
  return db.has(toString(cid))
}
let put = async (cid, buffer) => {
  db.put(toString(cid), buffer)
}

/* test server setup and push */
let _server = server({has, put})
_server.listen(2345, async () => {
  let rootBlock = await getRootBlock()
  let info = await client('ws://localhost:2345', rootBlock, get)
  console.log(info) // {pushed: 123} /* new blocks pushed */
})

/* uses unixfs to pull a directory recusively from fs */
let makeTestGraph = async () => {
  let unixfs = require('js-unixfsv2-draft')
  let last
  for await (let block of unixfs.dir(__dirname)) {
    last = block
    map.set(block.cid.toBaseEncodedString(), block.data)
  }
  return last
}
```

## client(url, rootBlock, get)

`url` is the URL for the websocket server.

`rootBlock` is an instance of `Block` from `ipfs-block` for the root node
of the tree you want to push.

`get` is an async function that takes a CID instance and returns a buffer.

## server({options})

Available options:

* `has(cid)` **Required.** Async function that returns boolean value if the service has the block for the cid (instance of CID).
* `put(cid, buffer)` **Required** Async function that writes the block to storage. Takes a CID instance and the binary representation of the block.
* `server` Instance of http or https server to bind websocket handler to.

## Server.listen(port, cb)

Identical to http/https server listen.

## Server.clost(cb)

Identical to http/https server close.

