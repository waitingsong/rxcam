require.config({
  baseUrl: '../dist',
  paths:   {
    'rxcam': 'rxcam',
  },
});

requirejs(['rxcam'], rxcam => {
  init(rxcam)
});

