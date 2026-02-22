<template>
  <div class="hero-container">
    <!-- Aurora Background -->
    <div class="aurora-bg"></div>
    
    <!-- Grid Background -->
    <div class="grid-bg"></div>
    
    <!-- Particle Canvas -->
    <canvas id="particle-canvas"></canvas>
    
    <!-- Floating Elements -->
    <div class="floating-elements">
      <div class="floating-element floating-1"></div>
      <div class="floating-element floating-2"></div>
      <div class="floating-element floating-3"></div>
    </div>
    
    <!-- Hero Content -->
    <div class="hero-content">
      <!-- Badge -->
      <div class="hero-badge">
        <span class="pulse-dot"></span>
        <span>Now serving 500+ Filipino developers</span>
      </div>
      
      <!-- Main Heading -->
      <h1 class="hero-title">
        <span class="reveal-text">The Philippines'</span>
        <span class="reveal-text gradient-text">Premier AI</span>
        <span class="reveal-text">Platform</span>
      </h1>
      
      <!-- Subtitle -->
      <p class="hero-subtitle">
        Access <span class="highlight">200+ AI models</span> including Claude, GPT, FLUX, and more. 
        Pay in <span class="highlight-accent">Philippine Pesos</span>. No credit card required.
      </p>
      
      <!-- CTA Buttons -->
      <div class="hero-cta">
        <a href="/getting-started/quickstart" class="btn-primary">
          <span>Start Building Free</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </a>
        <a href="/api/" class="btn-secondary">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          <span>View API Docs</span>
        </a>
      </div>
      
      <!-- Code Preview -->
      <div class="hero-code">
        <div class="code-window">
          <div class="code-header">
            <div class="code-dots">
              <span class="dot red"></span>
              <span class="dot yellow"></span>
              <span class="dot green"></span>
            </div>
            <span class="code-filename">example.js</span>
          </div>
          <pre class="code-content"><code><span class="keyword">const</span> <span class="variable">response</span> = <span class="keyword">await</span> <span class="function">fetch</span>(<span class="string">'https://ai-gateway.innoserver.cloud/v1/chat/completions'</span>, {
  <span class="property">method</span>: <span class="string">'POST'</span>,
  <span class="property">headers</span>: {
    <span class="string">'Authorization'</span>: <span class="string">'Bearer ik_...'</span>,
    <span class="string">'Content-Type'</span>: <span class="string">'application/json'</span>
  },
  <span class="property">body</span>: <span class="function">JSON</span>.<span class="function">stringify</span>({
    <span class="property">model</span>: <span class="string">'inno-ai-boyong-4.5'</span>,
    <span class="property">messages</span>: [{ <span class="property">role</span>: <span class="string">'user'</span>, <span class="property">content</span>: <span class="string">'Hello!'</span> }]
  })
});</code></pre>
        </div>
      </div>
    </div>
    
    <!-- Scroll Indicator -->
    <div class="scroll-indicator">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'

let animationId = null

onMounted(() => {
  // Initialize particle animation
  const canvas = document.getElementById('particle-canvas')
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  let width = canvas.width = canvas.offsetWidth
  let height = canvas.height = canvas.offsetHeight
  
  const particles = []
  const particleCount = 50
  
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.1
    })
  }
  
  function animate() {
    ctx.clearRect(0, 0, width, height)
    
    particles.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      
      if (p.x < 0 || p.x > width) p.vx *= -1
      if (p.y < 0 || p.y > height) p.vy *= -1
      
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(99, 102, 241, ${p.opacity})`
      ctx.fill()
    })
    
    // Draw connections
    particles.forEach((p1, i) => {
      particles.slice(i + 1).forEach(p2 => {
        const dx = p1.x - p2.x
        const dy = p1.y - p2.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        if (distance < 100) {
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.strokeStyle = `rgba(99, 102, 241, ${0.1 * (1 - distance / 100)})`
          ctx.stroke()
        }
      })
    })
    
    animationId = requestAnimationFrame(animate)
  }
  
  animate()
  
  // Handle resize
  const handleResize = () => {
    width = canvas.width = canvas.offsetWidth
    height = canvas.height = canvas.offsetHeight
  }
  
  window.addEventListener('resize', handleResize)
  
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    if (animationId) cancelAnimationFrame(animationId)
  })
})
</script>

<style scoped>
.hero-container {
  position: relative;
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin: -24px -24px 0 -24px;
  padding: 24px;
}

/* Aurora Background */
.aurora-bg {
  position: absolute;
  inset: 0;
  background: 
    radial-gradient(ellipse at 20% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 70%);
  animation: aurora 20s ease-in-out infinite;
}

@keyframes aurora {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(30px, -30px) rotate(120deg); }
  66% { transform: translate(-20px, 20px) rotate(240deg); }
}

/* Grid Background */
.grid-bg {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  animation: grid-move 20s linear infinite;
}

@keyframes grid-move {
  0% { transform: translate(0, 0); }
  100% { transform: translate(60px, 60px); }
}

/* Particle Canvas */
#particle-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* Floating Elements */
.floating-elements {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.floating-element {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.2;
}

.floating-1 {
  top: 10%;
  left: 5%;
  width: 300px;
  height: 300px;
  background: #6366f1;
  animation: float 8s ease-in-out infinite;
}

.floating-2 {
  bottom: 10%;
  right: 5%;
  width: 400px;
  height: 400px;
  background: #8b5cf6;
  animation: float 10s ease-in-out infinite 2s;
}

.floating-3 {
  top: 50%;
  left: 30%;
  width: 250px;
  height: 250px;
  background: #6366f1;
  animation: float 9s ease-in-out infinite 1s;
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(0, -30px); }
}

/* Hero Content */
.hero-content {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 1200px;
  text-align: center;
  padding: 4rem 0;
}

/* Badge */
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 9999px;
  font-size: 0.875rem;
  color: #9ca3af;
  margin-bottom: 2rem;
  animation: fade-in-up 0.8s ease-out;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Title */
.hero-title {
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  font-family: 'Inter', sans-serif;
}

.reveal-text {
  display: block;
  animation: fade-in-up 0.8s ease-out backwards;
}

.reveal-text:nth-child(1) { animation-delay: 0.1s; }
.reveal-text:nth-child(2) { animation-delay: 0.2s; }
.reveal-text:nth-child(3) { animation-delay: 0.3s; }

.gradient-text {
  background: linear-gradient(135deg, #6366f1, #8b5cf6, #6366f1);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 5s ease infinite;
}

@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* Subtitle */
.hero-subtitle {
  font-size: clamp(1rem, 2vw, 1.25rem);
  color: #9ca3af;
  max-width: 600px;
  margin: 0 auto 2rem;
  line-height: 1.6;
  animation: fade-in-up 0.8s ease-out 0.4s backwards;
}

.highlight {
  color: #fff;
  font-weight: 600;
}

.highlight-accent {
  color: #6366f1;
  font-weight: 600;
}

/* CTA Buttons */
.hero-cta {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 3rem;
  animation: fade-in-up 0.8s ease-out 0.5s backwards;
}

@media (min-width: 640px) {
  .hero-cta {
    flex-direction: row;
  }
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  font-weight: 600;
  border-radius: 9999px;
  text-decoration: none;
  transition: all 0.3s ease;
  box-shadow: 0 0 30px rgba(99, 102, 241, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 40px rgba(99, 102, 241, 0.5);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 2rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-weight: 600;
  border-radius: 9999px;
  text-decoration: none;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

/* Code Preview */
.hero-code {
  max-width: 700px;
  margin: 0 auto;
  animation: fade-in-up 0.8s ease-out 0.6s backwards;
}

.code-window {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 1rem;
  padding: 0.25rem;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.code-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.code-dots {
  display: flex;
  gap: 0.5rem;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.dot.red { background: #ef4444; }
.dot.yellow { background: #f59e0b; }
.dot.green { background: #10b981; }

.code-filename {
  font-size: 0.75rem;
  color: #6b7280;
  margin-left: auto;
}

.code-content {
  padding: 1.5rem;
  margin: 0;
  font-family: 'Fira Code', 'Monaco', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  overflow-x: auto;
  text-align: left;
}

.code-content .keyword { color: #c084fc; }
.code-content .variable { color: #60a5fa; }
.code-content .function { color: #fff; }
.code-content .string { color: #86efac; }
.code-content .property { color: #9ca3af; }

/* Scroll Indicator */
.scroll-indicator {
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  color: #6b7280;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(10px); }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Dark mode adjustments */
:root.dark .hero-container {
  background: linear-gradient(180deg, #0a0a0f 0%, #13131f 100%);
}
</style>
