module.exports = {
  extends: 'next/core-web-vitals',
  rules: {
    // Downgrade unused vars from error to warning
    '@typescript-eslint/no-unused-vars': 'warn',
    // Keep react-hooks/exhaustive-deps as warning
    'react-hooks/exhaustive-deps': 'warn'
  }
} 