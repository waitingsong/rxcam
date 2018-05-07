require.config({
  baseUrl: '../dist',
  paths:   {
    'rxcam': 'rxcam.umd.min',
  },
});

requirejs(['rxcam'], rxcam => {
  init(rxcam)
});

