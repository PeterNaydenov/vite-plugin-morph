/** @type {import('postcss-load-config').Config} */
export default {
  plugins: {
    'postcss-import': {},
    'postcss-nested': {},
    autoprefixer: {
      grid: true,
    },
    cssnano: process.env.NODE_ENV === 'production' ? {} : false,
  },
};
