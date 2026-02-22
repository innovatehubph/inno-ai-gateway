import DefaultTheme from 'vitepress/theme'
import './custom.css'
import CustomHero from './components/CustomHero.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router, siteData }) {
    // Register custom components
    app.component('CustomHero', CustomHero)
  }
}
