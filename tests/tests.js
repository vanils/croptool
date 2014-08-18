
$(function () {

    $('#crop-me').croptool({

        aspectRatio: 1400 / 600,

        selection: {
            x: 1000,
            y: 1000,
            w: 1000,
            h: 1000
        },

        onstart: function (selection) {
            console.log(selection);
        },

        onchange: function (selection) {
            console.log(selection);
        },

        onend: function (selection) {
            console.log(selection);
        }
    });

    

});