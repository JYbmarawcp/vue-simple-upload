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
    }
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
      // fileIndex = 0
      // console.log();
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
      // 初始化部分自定义属性
      rawFile.status = fileStatus.wait.code;
      rawFile.chunkList = [];
      rawFile.uploadProgress = 0;
      rawFile.fakeUploadProgress = 0; // 假进度条，处理恢复上传后，进度条后移的问题
      rawFile.hashProgress = 0;

      console.log(rawFile);
      this.uploadFiles.push(rawFile)
    },
    async handleUpload() {
      console.log('handleUpload -> this.uploadFiles', this.uploadFiles);
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