require.config({
  baseUrl: '../dist',
  paths:   {
    'rxcam': 'index.umd.min',
  },
});

requirejs(['rxcam'], rxcam => {
  init(rxcam)
});

