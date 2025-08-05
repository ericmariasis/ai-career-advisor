// Test rc-slider import
try {
  const Slider = require('rc-slider');
  console.log('✅ rc-slider import successful');
  console.log('Available exports:', Object.keys(Slider));
} catch (error) {
  console.log('❌ rc-slider import failed:', error.message);
}