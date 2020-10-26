const path = require('path')
const fse = require('fs-extra');
const url = require('url')

// 提取后缀名
const extractExt = filename =>
  filename.slice(filename.lastIndexOf('.'), filename.length)

// 大文件存储目录
const UPLOAD_DIR = path.resolve(__dirname, '..', 'target');

module.exports = class {
  // 验证是否已上传/已上传切片下标
  async handleVerifyUpload(req, res) {
    var data = url.parse(req.url, true)
    const { md5, filename } = data.query
    const ext = extractExt(filename)
    const filePath = path.resolve(UPLOAD_DIR, `${md5}${ext}`)
    // existsSync以同步的方法检测目录是否存在
    if (fse.existsSync(filePath)) {
      return rendAjax(res, {
        code: 200,
        message: '操作成功',
        data: {
          md5,
          presence: true
        }
      })
    } else {
      return rendAjax(res, {
        code: 200,
        message: '操作成功',
        data: {
          md5,
          presence: false
        }
      })
    }
  };
}

const rendAjax = (res, obj) => {
  res.end(JSON.stringify(obj))
}