<template>
  <div id="app">
    <div class="master-upload-container">
      <Simple
        ref="upload"
        :accept="accepts"
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
    
  }
}
</script>

<style scoped lang="scss">

</style>
