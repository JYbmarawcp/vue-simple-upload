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
  </div>
</template>

<script>
import axios, { CancelToken } from 'axios'

const instance = axios.create({})

const chunkSize = 10 * 1024 * 1024; // 切片大小
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
    // 上传文件时携带的参数
    uploadArguments: {
      type: Object,
      default: () => ({})
    },
  },
  data () {
    return {
      status: Status.wait,
      uploadFiles: [],
    }
  },
  created () {
    
  },
  methods: {
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
        filesArr[i].status = fileStatus.uploading.code


        console.log(fileChunkList);
        console.log('handleUpload ->  this.chunkData', filesArr[i])
        await this.uploadChunks(filesArr[i])
      }
    },
    // 将切片传输给服务端
    async uploadChunks(data) {
      return data
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
</style>