'use strict';

export default {
  singleQuote: true,
  trailingComma: 'es5',
  overrides: [
    {
      files: '*.hbs',
      options: {
        singleQuote: false,
      },
    },
  ],
};
