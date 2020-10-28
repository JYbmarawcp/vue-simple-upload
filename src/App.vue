<template>
  <div id="app">
    <div class="master-upload-container">
      <Simple
        ref="upload"
        :accept="accepts"
        :base-url="baseUrl"
      >

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
