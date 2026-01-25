// voice-demo-admin.js
// Medienauswahl für die Audio-URL im Voice Demo CPT.

jQuery(function ($) {
    var audioFrame = null;

    $("#voice_demo_audio_url_button").on("click", function (e) {
        e.preventDefault();

        // Wenn der Frame bereits existiert, erneut öffnen
        if (audioFrame) {
            audioFrame.open();
            return;
        }

        // Neuen Media Frame erstellen – nur Audio-Dateien
        audioFrame = wp.media({
            title: "Audiodatei auswählen",
            button: {
                text: "Übernehmen"
            },
            library: {
                type: ["audio"]
            },
            multiple: false
        });

        audioFrame.on("select", function () {
            var attachment = audioFrame.state().get("selection").first().toJSON();
            if (!attachment || !attachment.url) {
                return;
            }

            $("#voice_demo_audio_url").val(attachment.url);

            // Falls noch keine Download-URL gesetzt ist, automatisch mit der Audio-URL befüllen
            var $download = $("#voice_demo_download_url");
            if ($download.length && !$download.val()) {
                $download.val(attachment.url);
            }
        });

        audioFrame.open();
    });
});
