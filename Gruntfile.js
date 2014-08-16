
module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        jshint: {
            all: ['src/**/*.js']
        },

        uglify: {
            options: {
                banner: grunt.file.read('src/banner.js')
            },

            build: {
                src: 'src/core.js',
                dest: 'build/jquery.croptool.min.js'
            }
        },

        watch: {
            scripts: {
                options: {
                    spawn: false,
                },

                files: ['src/**/*.js'],
                tasks: ['jshint', 'concat', 'uglify']
            },
        },

        concat: {
            scripts: {
                options: {
                    banner: grunt.file.read('src/banner.js')
                },

                src: ['src/core.js'],
                dest: 'build/jquery.croptool.js',
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.registerTask('default', ['watch']);
};