module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
  },
  parserOptions: {
    parser: 'babel-eslint',
  },
  extends: [
    'airbnb-base',
    'plugin:vue/recommended',
  ],
  rules: {
    'no-new': 'off',
    'no-param-reassign': 'off',
    'no-plusplus': 'off',
    'object-shorthand': 'off',
    'prefer-destructuring': 'off',
    'prefer-template': 'off',
    'vue/max-attributes-per-line': 3,
  },
};
