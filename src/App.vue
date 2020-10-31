<template>
  <div id="app">
    <div class="master-upload-container">
      <Simple
        ref="upload"
        :accept="accepts"
        :base-url="baseUrl"
        :chunk-size="chunkSize"
      >
        <div slot="tip" class="upload-tip">
          <i class="el-icon-info"></i>:
          只能上传: zip,rar
        </div>
      </Simple>
    </div>
  </div>
</template>

<script>
import Simple from "./components/simple"

export default {
  name: 'app',
  components: {
    Simple
  },
  data () {
    return {
      accepts: '.jpg, .jpeg, .png',
      chunkSize: 50 * 1024 *1024,
    }
  },
  methods: {
    
  },
  computed: {
    baseUrl() {
      return 'http://localhost:3003/';
    }
  }
}
</script>

<style scoped lang="scss">

</style>
