module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    jsdoc: {
      dist: {
        src: ['lib/**/*.js', 'README.md'],
        dest: 'docs'
      }
    },
    clean: {
      folder: ['docs']
    }
  });

  // Register jsdoc as a grunt task
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('docs', ['clean', 'jsdoc']);
};
