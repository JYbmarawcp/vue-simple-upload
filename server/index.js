const http = require('http')
const server = http.createServer()
const Controller = require('./controller')

const controller = new Controller()

server.on('request', async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', '*')
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })

  if (req.url.indexOf('fileChunk/presence') !== -1) {
    await controller.handleVerifyUpload(req, res)
    return
  }
})

server.listen(3001, '0.0.0.0', () => console.log('正在监听 3001 端口'))