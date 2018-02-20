Opeka


Using HowlerJS as external library (add the following to *.libraries.yml):

goldfire.howlerjs:
  remote: https://github.com/goldfire/howler.js
  version: 2.0.9
  license:
    name: MIT
    url: https://github.com/goldfire/howler.js/blob/master/LICENSE.md
    gpl-compatible: true
  js:
    //cdnjs.cloudflare.com/ajax/libs/howler/2.0.9/howler.min.js: { type: external, minified: true }