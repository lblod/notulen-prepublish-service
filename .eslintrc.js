module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  plugins: ["mocha"],
  extends: [
    "eslint:recommended",
    "plugin:mocha/recommended",
    "plugin:prettier/recommended",
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: "module",
  },
  rules: {
    "linebreak-style": ["error", "unix"],
    semi: ["error", "always"],
  },
};
