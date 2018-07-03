const getBuffer = stream => {
  return new Promise((resolve, reject) => {
    let chunks = []
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('end', () => {
      resolve(Buffer.concat(chunks))
    })
    stream.on('error', reject)
  })
}

exports.getBuffer = getBuffer
