<script lang="ts">
export default {}
</script>

<style lang="scss">
@use '@mobile-core/styles/global.scss' as platform;
@use '@mobile-core/styles/workspace.scss' as workspace;

/* #ifdef MP-WEIXIN */
@include platform.apply('tms', $embed-body-font: false);
/* #endif */
/* #ifndef MP-WEIXIN */
@include platform.apply('tms');
/* #endif */
@include workspace.apply();
</style>
