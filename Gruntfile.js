
module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        jshint: {
            all: ['src/**/*.js']
        },

        uglify: {
            options: {
                banner: grunt.file.read('src/scripts/banner.js')
            },

            build: {
                src: 'src/scripts/core.js',
                dest: 'build/jquery.croptool.min.js'
            }
        },

        sass: {
            expanded: {
                options: {
                    style: 'expanded'
                },
                files: {
                    'build/jquery.croptool.css': 'src/styles/main.scss'
                }
            },

            compressed: {
                options: {
                    style: 'compressed'
                },
                files: {
                    'build/jquery.croptool.min.css': 'src/styles/main.scss'
                }
            }
        },

        watch: {
            scripts: {
                options: {
                    spawn: false
                },

                files: ['src/scripts/**/*.js'],
                tasks: ['jshint', 'concat', 'uglify']
            },
            styles: {
                options: {
                    spawn: false
                },

                files: ['src/styles/**/*.scss'],
                tasks: ['sass']
            }
        },

        concat: {
            scripts: {
                options: {
                    banner: grunt.file.read('src/scripts/banner.js')
                },

                src: ['src/scripts/core.js'],
                dest: 'build/jquery.croptool.js',
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-sass');

    grunt.registerTask('default', ['watch']);
};