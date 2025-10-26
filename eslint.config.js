module.exports = {
  extends: [
    "next/core-web-vitals",
    "next/typescript"
  ],
  rules: {
    // TypeScript specific rules
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/prefer-const": "error",
    
    // React specific rules
    "react-hooks/exhaustive-deps": "warn",
    "react/no-unescaped-entities": "off",
    
    // General rules
    "no-console": "warn",
    "prefer-const": "error",
    "no-var": "error",
  },
};
