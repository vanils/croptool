
$(function () {

    $('#crop-me').croptool({
        aspectRatio: 1400 / 600,
        persistent: false
    });

    window.setTimeout(function () {
        $('#crop-me').croptool('destroy');
    }, 3000);
});