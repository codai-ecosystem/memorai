import { createRequire } from 'module';
const require = createRequire(import.meta.url);

console.log('Testing @codai/memorai-core imports...');

try {
  // Try to require the package
  const pkg = await import('@codai/memorai-core');
  console.log('✅ Package loaded successfully');
  console.log('📦 Available exports:', Object.keys(pkg));
  
  if (pkg.UnifiedMemoryEngine) {
    console.log('✅ UnifiedMemoryEngine found');
  } else {
    console.log('❌ UnifiedMemoryEngine NOT found');
    console.log('Available:', Object.keys(pkg).filter(k => k.includes('Memory')));
  }
} catch (error) {
  console.error('❌ Failed to import package:', error.message);
}
