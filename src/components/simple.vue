<template>
  <div class="simpel-upload-container">
    <div class="total-progress">
      <div class="btns">
        <el-button-group>
          <el-button 
            :disabled="changeDisabled"
            icon="el-icon-upload2"
          >选择文件
            <input
              v-if="!changeDisabled"
              type="file"
              :multiple="multiple"
              class="select-file-input"
              :accept="accept"
              @change="handleFileChange"
            />
          </el-button>
          <el-button 
            :disabled="changeDisabled" 
            @click="handleUpload"
            icon="el-icon-upload"
          >上传</el-button>
          <!-- <el-button 
            :disabled="pauseDisabled" 
            @click="handlePause"
            icon="el-icon-video-pause"
          >暂停</el-button>
          <el-button 
            :disabled="resumeDisabled" 
            @click="handleResume"
            icon="el-icon-video-play"
          >恢复</el-button>
          <el-button 
            :disabled="clearDisabled" 
            @click="clearFiles"
            icon="el-icon-delete"
          >清空</el-button> -->
        </el-button-group>
        <slot name="header"></slot>
      </div>
    </div>

    <div class="file-list">
      
    </div>
    <slot name="tip"></slot>
  </div>
</template>

<script>
import { addChunkStorage, getChunkStorage, clearLocalStorage } from '@/utils/localstorage'
import axios, { CancelToken } from 'axios'

const instance = axios.create({})

let chunkSize = 10 * 1024 * 1024; // 切片大小
var fileIndex = 0 // 当前正在被遍历的文件下标
// 所有文件状态
const Status = {
  wait: 'wait',
  pause: 'pause',
  uploading: 'uploading',
  hash: 'hash',
  error: 'error',
  done: 'done'
}
// 单个文件的状态 对应描述
const fileStatus = {
  wait: {
    code: 'wait',
    name: '待上传'
  },
  uploading: {
    code: 'uploading',
    name: '上传中'
  },
  success: {
    code: 'success',
    name: '成功'
  },
  error: {
    code: 'error',
    name: '失败'
  },
  secondPass: {
    code: 'secondPass',
    name: '已秒传'
  },
  pause: {
    code: 'pause',
    name: '暂停'
  },
  resume: {
    code: 'resume',
    name: '恢复'
  }
}

export default {
  props: {
    accept: {
      type: String,
      default: ''
    },
    multiple: {
      type: Boolean,
      default: true
    },
    // 文件个数
    limit: {
      type: Number,
      default: 20
    },
    baseUrl: {
      type: String,
      default: ''
    },
    // 切片大小
    chunkSize: {
      type: Number,
      default: 10 * 1024 * 1024
    },
    // 上传文件时携带的参数
    uploadArguments: {
      type: Object,
      default: () => ({})
    },
  },
  data () {
    return {
      status: Status.wait, // 默认状态
      uploadFiles: [],
      tempThreads: 3,
    }
  },
  created() {
    this.setAxios()
  },
  methods: {
    setAxios() {
      // 设置baseUrl
      if (this.baseUrl) {
        instance.defaults.baseURL = this.baseUrl
      }

      // 设置切片大小
      chunkSize = this.chunkSize;
    },
    handleFileChange(e) {
      const files = e.target.files
      console.log('handleFileChange -> file', files)
      if (!files) return

      // 重置文件下标
      fileIndex = 0 // 重置文件下标
      // 判断文件选择的个数
      if (this.limit && files.length > this.limit) {
        return
      }

      this.status = Status.wait

      const postFiles = Array.prototype.slice.call(files)
      console.log('file -> postFiles', postFiles)
      postFiles.forEach(item => {
        this.handleStart(item)
      })
    },
    handleStart(rawFile) {
      // 对每个文件进行初始化自定义属性
      rawFile.status = fileStatus.wait.code;
      rawFile.chunkList = [];
      rawFile.uploadProgress = 0;
      rawFile.fakeUploadProgress = 0; // 假进度条，处理恢复上传后，进度条后移的问题
      rawFile.hashProgress = 0;

      this.uploadFiles.push(rawFile)
    },
    async handleUpload() {
      console.log('handleUpload -> this.uploadFiles', this.uploadFiles)
      if (!this.uploadFiles) return
      this.status = Status.uploading
      const filesArr = this.uploadFiles

      // 对单个文件逐一上传
      for(let i = 0; i < filesArr.length; i++) {
        fileIndex = i
        // 文件切片
        const fileChunkList = this.createFileChunk(filesArr[i])

        // 若不是恢复, 再进行hash计算
        if (filesArr[i].status !== 'resume') {
          this.status = Status.hash
          // hash校验, 是否为秒传
          filesArr[i].hash = await this.calculateHash(fileChunkList)

          // 若清空或者状态为等待, 则跳出循环
          if (this.status === Status.wait) {
            console.log('若清空或者状态为等待，则跳出循环');
            break
          }

          console.log('handleUpload -> hash', filesArr[i])
        }

        this.status = Status.uploading

        // 检验重复
        const verifyRes = await this.verifyUpload(filesArr[i].name, filesArr[i].hash)
        if (verifyRes.data.presence) {
          console.log('进入1', verifyRes);
          filesArr[i].status = fileStatus.secondPass.code
          filesArr[i].uploadProgress = 100
          // 判断是否都已经上传
          this.isAllStatus()
        } else {
          console.log('开始上传文件=======>', filesArr[i].name)
          filesArr[i].status = fileStatus.uploading.code

          // const getChunkStorage = this.getChunkStorage(filesArr[i].hash)
          filesArr[i].fileHash = filesArr[i].hash // 文件的hash, 合并时使用
          // 自定义chunkList
          filesArr[i].chunkList = fileChunkList.map(({ file }, index) => ({
            fileHash: filesArr[i].hash,
            fileName: filesArr[i].name,
            index,
            hash: filesArr[i].hash + '-' + index,
            chunk: file,
            size: file.size,
            // uploaded: // 标识: 是否已经完成上传
            progress: 0,
            status: 'success' // 上传状态, 用作进度状态显示
          }))

          this.$set(filesArr, i, filesArr[i])

          console.log('handleUpload ->  this.chunkData', filesArr[i])
          await this.uploadChunks(filesArr[i])
        }
      }
    },
    // 将切片传输给服务端
    async uploadChunks(data) {
      console.log('uploadChunks -> data', data)
      let chunkData = data.chunkList
      const requestDataList = chunkData.filter(({ uploaded }) => !uploaded)
        .map(({ fileHash, chunk, fileName, index}) => {
          const formData = new FormData()
          formData.append('md5', fileHash)
          formData.append('file', chunk)
          formData.append('chunkId', index) // 文件名使用切片的下标
          return { formData, index, fileName }
        })
      
      console.log('uploadChunks -> requestDataList', requestDataList)

      // 并发上传
      try {
        const ret = await this.sendRequest(requestDataList, chunkData)
        console.log('uploadChunks -> chunkData', chunkData)
        console.log('ret', ret)
      } catch (error) {
        // 上传有被reject的
        this.$message.error('亲 上传失败了, 考虑重试下呦' + error)
        return
      }

      //合并切片
      const isUpload = chunkData.some(item => item.uploading === false)
      if (isUpload) {
        alert('存在失败的切片')
      } else {
        // 执行合并
        try {
          await this.mergeRequest(data)
        } catch (error) {
          console.error(error)
        }
      }
    },
    // 并发处理
    sendRequest(froms, chunkData) {
      console.log('sendRequest -> forms', froms)
      console.log('sendRequest -> chunkData', chunkData)
      let finished = 0
      const total = froms.length
      const self = this
      const retryArr = [] // 数组存储每个文件hash请求的重试次数, 就是第0个文件切片报错1次
      const chunkRetry = 3 // 重试限制次数(3次)

      return new Promise((resolve, reject) => {
        const handler = () => {
          console.log('handler -> forms', froms)
          if (froms.length) {
            // 出栈
            const formInfo = froms.shift()

            const formData = formInfo.formData
            const index = formInfo.index

            instance
              .post('fileChunk', formData)
              .then(res => {
                console.log('handler -> res', res)
                // 更改状态
                chunkData[index].uploaded = true
                chunkData[index].status = 'success'
                // 存储已上传的切片下标
                addChunkStorage(chunkData[index].fileHash, index)

                finished++
                handler()
              })
              .catch((e) => {
                // 若状态为暂停或等待, 则禁止重试
                console.log('handler -> this.status', this.status)
                if ([Status.pause, Status.wait].includes(this.status)) return

                console.warn('出现错误', e)
                console.log('handler -> retryArr', retryArr)
                if (typeof retryArr[index] !== 'number') {
                  retryArr[index] = 0
                }

                // 更新状态
                chunkData[index].status = 'warning'

                // 累加错误次数
                retryArr[index]++

                // 重试3次
                if (retryArr[index] >= chunkRetry) {
                  console.warn('重试失败 ---> handler -> retryArr', retryArr, chunkData[index].hash);
                  return reject('重试失败', retryArr);
                }

                console.log('handler -> retryArr[finished]', `${chunkData[index].hash}--进行第${retryArr[index]}'次重试'`)
                console.log(retryArr)

                this.tempThreads++; // 释放当前占用的通道 ？？？

                // 将失败的重新加入队列
                froms.push(formInfo)
                handler()
              })
          }
          if (finished >= total) {
            resolve('done')
          }
        }

        // for循环控制并发的初始并发数, 然后在handler函数里调用自己
        for (let i = 0; i < this.tempThreads; i++) {
          console.log(111);
          handler()
        }
      })
    },
    // 通知服务器合并切片
    mergeRequest(data) {
      const obj = {
        md5: data.fileHash,
        fileName: data.name,
        fileChunkNun: data.chunkList.length,
        ...this.uploadArguments
      }

      instance.post('fileChunk/merge', obj, {
        timeout: 0
      }).then(res => {
        // 清除storage
        if (res.data.code === 200) {
          console.log('mergeRequest -> data', data);
        }
      })
    },
    // 创建文件切片
    createFileChunk(file, size = chunkSize) {
      const fileChunkList = []
      let count = 0
      while(count < file.size) {
        fileChunkList.push({
          file: file.slice(count, count + size)
        })
        count += size
      }
      console.log('createFileChunk -> fileChunkList', fileChunkList)
      return fileChunkList
    },
    // 生成文件 hash(web-worker)
    calculateHash(fileChunkList) {
      console.log('calculateHash -> fileChunkList', fileChunkList)
      return new Promise(resolve => {
        this.worker = new Worker('./hash-worker.js')
        this.worker.postMessage({ fileChunkList })
        this.worker.onmessage = e => {
          const { percentage, hash } = e.data
          if (this.uploadFiles[fileIndex]) {
            this.uploadFiles[fileIndex].hashProgress = Number(percentage.toFixed(0))
            this.$set(this.uploadFiles, fileIndex, this.uploadFiles[fileIndex])
          }
          if (hash) {
            resolve(hash)
          }
        }
      })
    },
    // 文件上传之前的校验: 校验文件是否已存在
    verifyUpload(fileName, fileHash) {
      return new Promise(resolve => {
        const obj = {
          md5: fileHash,
          fileName,
          ...this.uploadArguments
        }
        //
        instance
          .get('fileChunk/presence', { params: obj })
          .then(res => {
            console.log('verifyUpload -> res', res)
            resolve(res.data)
          })
          .catch(err => {
            console.log('verifyUpload -> err', err)
          })
      })
    },
    isAllStatus() {
      const isAllSuccess = this.uploadFiles.every(item => 
        ['success', 'secondPass', 'error'].includes(item.status))
      console.log('mergeRequest -> isAllSuccess', isAllSuccess)
      if (isAllSuccess) {
        this.status = Status.done
        this.$emit('success')
      }
    }
  },
  computed: {
    changeDisabled() {
      return false
    },
  }
}
</script>

<style scoped lang="scss">
.simpel-upload-container {
  border: 1px solid #d2d2d2;
  border-radius: 4px;
  background-color: #fff;
  padding: 10px;
  margin-bottom: 20px;
  .total-progress {
    margin-bottom: 15px;
    .btns {
      position: relative;
      .select-file-input {
        position: absolute;
        display: inline-block;
        left: 0;
        top: 0;
        border: none;
        opacity: 0;
        width: 96px;
        height: 28px;
      }
    }
  }

  .upload-tip {
    font-size: 12px;
    color: #606266;
    margin-top: 7px;
  }
}

</style>