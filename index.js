const http2 = require('http2')
const fs = require('fs')

const server = http2.createServer()

server.on('error', (err) => console.error(err))

server.on('stream', (stream, headers) => {
  // stream is a Duplex
  stream.on('data', chunk => console.log({chunk: chunk.toString()}))
  stream.respond({
    'content-type': 'text/html',
    ':status': 200
  });
  stream.end('<h1>Hello World</h1>')
  console.log({stream})

  stream.pushStream(
    {':path': '/_graphpush/get/test'},  (err, pushStream, headers) => {
      console.log({err, pushStream, headers})
  })
})

server.listen(8443)


const client = http2.connect('http://localhost:8443')
client.on('error', (err) => console.error(err))

const req = client.request({ ':path': '/_graphpush/push', ':method': 'PUT' })
req.write('Test')

client.on('stream', (stream, headers) => {
  console.log({headers})
})

req.on('response', (headers, flags) => {
  for (const name in headers) {
    console.log(`${name}: ${headers[name]}`)
  }
})

req.setEncoding('utf8')
let data = '';
req.on('data', (chunk) => { data += chunk; })
req.on('end', () => {
  console.log(`\n${data}`)
  client.close()
})
req.end()
