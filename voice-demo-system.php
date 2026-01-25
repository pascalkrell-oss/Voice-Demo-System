<?php
/*
Plugin Name: Voice Demo System
Plugin URI: https://sprecher-pascal.de
Description: Komfortables Demo-Management für professionelle Sprecher: Demos als eigenen Inhaltstyp verwalten, nach Genre, Stimmung und Stil filtern, Demo-Grids und einen Standalone-Player ausgeben und gemerkte Demos direkt ins Kontaktformular übernehmen.
Version: 1.0
Author: Pascal Krell
Author URI: https://sprecher-pascal.de
Text Domain: voice-demo-system
*/
if (!defined('ABSPATH')) {
    exit;
}

class PK_Voice_Demo_System {

    public function __construct() {
        add_action('init', array($this, 'register_post_type'));
        add_action('init', array($this, 'register_taxonomy'));
        add_action('add_meta_boxes', array($this, 'add_meta_box'));
        add_action('save_post', array($this, 'save_meta'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_assets'));
        add_action('wp_footer', array($this, 'render_global_drawer'));

        add_shortcode('voice_demo_grid', array($this, 'render_demo_grid'));
        add_shortcode('voice_demo_player', array($this, 'render_demo_player'));

        add_filter('manage_voice_demo_posts_columns', array($this, 'add_shortcode_column'));
        add_action('manage_voice_demo_posts_custom_column', array($this, 'render_shortcode_column'), 10, 2);
    }

    /**
     * Vordefinierte Optionslisten für Stil, Stimmung, Tempo usw.
     */
    private function get_attribute_options() {
        return array(
            'style' => array(
                'neutral'        => 'Neutral',
                'sachlich'       => 'Sachlich',
                'warm'           => 'Warm',
                'jung'           => 'Jung',
                'frisch'         => 'Frisch',
                'dynamisch'      => 'Dynamisch',
                'verkaufend'     => 'Verkaufend',
                'locker'         => 'Locker',
                'nahbar'         => 'Nahbar',
                'serioes'        => 'Seriös',
                'vertrauensvoll' => 'Vertrauensvoll',
                'storytelling'   => 'Storytelling',
            ),
            'mood' => array(
                'ruhig'      => 'Ruhig',
                'freundlich' => 'Freundlich',
                'sachlich'   => 'Sachlich',
                'emotional'  => 'Emotional',
                'energisch'  => 'Energisch',
                'humorvoll'  => 'Humorvoll',
                'serioes'    => 'Seriös',
            ),
            'speed' => array(
                'sehr-ruhig'   => 'Sehr ruhig',
                'ruhig'        => 'Ruhig',
                'mittel'       => 'Mittel',
                'schnell'      => 'Schnell',
                'sehr-schnell' => 'Sehr schnell',
            ),
            'pitch' => array(
                'sehr-tief' => 'Sehr tief',
                'tief'      => 'Tief',
                'mittel'    => 'Mittel',
                'hoch'      => 'Hoch',
                'sehr-hoch' => 'Sehr hoch',
            ),
            'industry' => array(
                'automotive'      => 'Automotive',
                'healthcare'      => 'Healthcare',
                'finanzen'        => 'Finanzen',
                'it-tech'         => 'IT / Technologie',
                'industrie'       => 'Industrie / Technik',
                'handel-ecom'     => 'Handel / E-Commerce',
                'tourismus'       => 'Tourismus',
                'food-beverage'   => 'Food & Beverage',
                'non-profit'      => 'Non-Profit / NGO',
            ),
        );
    }

    public function register_post_type() {
        $labels = array(
            'name'               => 'Voice Demos',
            'singular_name'      => 'Voice Demo',
            'menu_name'          => 'Voice Demos',
            'name_admin_bar'     => 'Voice Demo',
            'add_new'            => 'Neu hinzufügen',
            'add_new_item'       => 'Neue Demo hinzufügen',
            'edit_item'          => 'Demo bearbeiten',
            'new_item'           => 'Neue Demo',
            'view_item'          => 'Demo ansehen',
            'search_items'       => 'Demos durchsuchen',
            'not_found'          => 'Keine Demos gefunden',
            'not_found_in_trash' => 'Keine Demos im Papierkorb',
        );

        $args = array(
            'labels'             => $labels,
            'public'             => false,
            'show_ui'            => true,
            'show_in_menu'       => true,
            'menu_icon'          => 'dashicons-microphone',
            'supports'           => array('title'),
            'has_archive'        => false,
            'rewrite'            => false,
        );

        register_post_type('voice_demo', $args);
    }

    public function register_taxonomy() {
        $labels = array(
            'name'              => 'Demo-Kategorien',
            'singular_name'     => 'Demo-Kategorie',
            'search_items'      => 'Kategorien durchsuchen',
            'all_items'         => 'Alle Kategorien',
            'edit_item'         => 'Kategorie bearbeiten',
            'update_item'       => 'Kategorie aktualisieren',
            'add_new_item'      => 'Neue Kategorie hinzufügen',
            'new_item_name'     => 'Name der neuen Kategorie',
            'menu_name'         => 'Demo-Kategorien',
        );

        $args = array(
            'hierarchical'      => true,
            'labels'            => $labels, // <- hier war vorher der Syntaxfehler
            'show_ui'           => true,
            'show_admin_column' => true,
            'query_var'         => true,
        );

        register_taxonomy('voice_demo_category', array('voice_demo'), $args);
    }

    public function add_meta_box() {
        add_meta_box(
            'voice_demo_meta',
            'Demo-Informationen',
            array($this, 'render_meta_box'),
            'voice_demo',
            'normal',
            'default'
        );
    }

    public function render_meta_box($post) {
        wp_nonce_field('voice_demo_meta_box', 'voice_demo_meta_box_nonce');

        $audio_url    = get_post_meta($post->ID, '_voice_demo_audio_url', true);
        $download_url = get_post_meta($post->ID, '_voice_demo_download_url', true);
        $mood_saved   = get_post_meta($post->ID, '_voice_demo_mood', true);
        $style_saved  = get_post_meta($post->ID, '_voice_demo_style', true);
        $speed_saved  = get_post_meta($post->ID, '_voice_demo_speed', true);
        $pitch_saved  = get_post_meta($post->ID, '_voice_demo_pitch', true);
        $industry     = get_post_meta($post->ID, '_voice_demo_industry', true);
        $badge        = get_post_meta($post->ID, '_voice_demo_badge', true);

        $opts = $this->get_attribute_options();

        $style_values = is_array($style_saved) ? $style_saved : ($style_saved !== '' ? array($style_saved) : array());
        $mood_values  = is_array($mood_saved)  ? $mood_saved  : ($mood_saved !== ''  ? array($mood_saved)  : array());
        $speed_values = is_array($speed_saved) ? $speed_saved : ($speed_saved !== '' ? array($speed_saved) : array());
        $pitch_values = is_array($pitch_saved) ? $pitch_saved : ($pitch_saved !== '' ? array($pitch_saved) : array());
        ?>
        <table class="form-table">
            <tr>
                <th><label for="voice_demo_audio_url">Audio URL</label></th>
                <td>
                    <input type="text" id="voice_demo_audio_url" name="voice_demo_audio_url" class="regular-text" value="<?php echo esc_attr($audio_url); ?>" />
                    <button type="button" class="button" id="voice_demo_audio_url_button">Aus Mediathek wählen</button>
                    <p class="description">Wähle hier die Audiodatei aus der Mediathek.</p>
                </td>
            </tr>
            <tr>
                <th><label for="voice_demo_download_url">Download URL</label></th>
                <td>
                    <input type="text" id="voice_demo_download_url" name="voice_demo_download_url" class="regular-text" value="<?php echo esc_attr($download_url); ?>" />
                    <p class="description">Optional. Wenn leer, wird die Audio URL als Download verwendet.</p>
                </td>
            </tr>
            <tr>
                <th><label for="voice_demo_badge">Demo-ID / Kennung</label></th>
                <td>
                    <input type="text" id="voice_demo_badge" name="voice_demo_badge" class="regular-text" value="<?php echo esc_attr($badge); ?>" />
                    <p class="description">Kurze Kennung wie z.B. "G01", "IV-03". Wird als Badge im Frontend und in der Anfrage verwendet.</p>
                </td>
            </tr>
            <tr>
                <th>Stil / Tonalität</th>
                <td>
                    <?php if (!empty($opts['style'])) : ?>
                        <?php foreach ($opts['style'] as $slug => $label) : ?>
                            <label style="display:block;margin-bottom:2px;">
                                <input type="checkbox"
                                       name="voice_demo_style[]"
                                       value="<?php echo esc_attr($slug); ?>"
                                       <?php checked(in_array($slug, $style_values, true)); ?> />
                                <?php echo esc_html($label); ?>
                            </label>
                        <?php endforeach; ?>
                        <p class="description">Mehrfachauswahl möglich.</p>
                    <?php endif; ?>
                </td>
            </tr>
            <tr>
                <th>Emotion / Stimmung</th>
                <td>
                    <?php if (!empty($opts['mood'])) : ?>
                        <?php foreach ($opts['mood'] as $slug => $label) : ?>
                            <label style="display:block;margin-bottom:2px;">
                                <input type="checkbox"
                                       name="voice_demo_mood[]"
                                       value="<?php echo esc_attr($slug); ?>"
                                       <?php checked(in_array($slug, $mood_values, true)); ?> />
                                <?php echo esc_html($label); ?>
                            </label>
                        <?php endforeach; ?>
                        <p class="description">Mehrfachauswahl möglich.</p>
                    <?php endif; ?>
                </td>
            </tr>
            <tr>
                <th>Sprechtempo</th>
                <td>
                    <?php if (!empty($opts['speed'])) : ?>
                        <?php foreach ($opts['speed'] as $slug => $label) : ?>
                            <label style="display:block;margin-bottom:2px;">
                                <input type="checkbox"
                                       name="voice_demo_speed[]"
                                       value="<?php echo esc_attr($slug); ?>"
                                       <?php checked(in_array($slug, $speed_values, true)); ?> />
                                <?php echo esc_html($label); ?>
                            </label>
                        <?php endforeach; ?>
                        <p class="description">Mehrfachauswahl möglich.</p>
                    <?php endif; ?>
                </td>
            </tr>
            <tr>
                <th>Tonhöhe</th>
                <td>
                    <?php if (!empty($opts['pitch'])) : ?>
                        <?php foreach ($opts['pitch'] as $slug => $label) : ?>
                            <label style="display:block;margin-bottom:2px;">
                                <input type="checkbox"
                                       name="voice_demo_pitch[]"
                                       value="<?php echo esc_attr($slug); ?>"
                                       <?php checked(in_array($slug, $pitch_values, true)); ?> />
                                <?php echo esc_html($label); ?>
                            </label>
                        <?php endforeach; ?>
                        <p class="description">Mehrfachauswahl möglich.</p>
                    <?php endif; ?>
                </td>
            </tr>
            <tr>
                <th><label for="voice_demo_industry">Branche</label></th>
                <td>
                    <select id="voice_demo_industry" name="voice_demo_industry">
                        <option value="">Keine Angabe</option>
                        <?php if (!empty($opts['industry'])) : ?>
                            <?php foreach ($opts['industry'] as $slug => $label) : ?>
                                <option value="<?php echo esc_attr($slug); ?>" <?php selected($industry, $slug); ?>>
                                    <?php echo esc_html($label); ?>
                                </option>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </select>
                </td>
            </tr>
            
        </table>
        <?php
    }

    
    /**
     * Vergibt automatisch die nächste freie numerische Demo-ID (Badge),
     * beginnend bei 1. Nutzt alle vorhandenen voice_demo-Posts.
     */
    public function generate_next_badge() {
        $args = array(
            'post_type'      => 'voice_demo',
            'post_status'    => array('publish', 'pending', 'draft'),
            'posts_per_page' => -1,
            'fields'         => 'ids',
        );

        $posts = get_posts($args);
        $max   = 0;

        if (!empty($posts)) {
            foreach ($posts as $pid) {
                $value = get_post_meta($pid, '_voice_demo_badge', true);
                if ($value !== '' && is_numeric($value)) {
                    $int_val = (int) $value;
                    if ($int_val > $max) {
                        $max = $int_val;
                    }
                }
            }
        }

        return (string) ($max + 1);
    }

public function save_meta($post_id) {
        if (!isset($_POST['voice_demo_meta_box_nonce'])) {
            return;
        }
        if (!wp_verify_nonce($_POST['voice_demo_meta_box_nonce'], 'voice_demo_meta_box')) {
            return;
        }
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        if (isset($_POST['post_type']) && 'voice_demo' === $_POST['post_type']) {
            if (!current_user_can('edit_post', $post_id)) {
                return;
            }
        }

        $fields_single = array(
            'voice_demo_audio_url'    => '_voice_demo_audio_url',
            'voice_demo_download_url' => '_voice_demo_download_url',
            'voice_demo_industry'     => '_voice_demo_industry',
            'voice_demo_badge'        => '_voice_demo_badge',
        );

                foreach ($fields_single as $field => $meta_key) {
            if (isset($_POST[$field])) {
                update_post_meta($post_id, $meta_key, sanitize_text_field(wp_unslash($_POST[$field])));
            }
        }

        // Wenn keine Demo-ID (Badge) gesetzt ist, automatisch die nächste freie Nummer vergeben
        $badge_meta = get_post_meta($post_id, '_voice_demo_badge', true);
        if (empty($badge_meta)) {
            $next = $this->generate_next_badge();
            update_post_meta($post_id, '_voice_demo_badge', $next);
        }

        $fields_multi = array(
            'voice_demo_style' => '_voice_demo_style',
            'voice_demo_mood'  => '_voice_demo_mood',
            'voice_demo_speed' => '_voice_demo_speed',
            'voice_demo_pitch' => '_voice_demo_pitch',
        );

        foreach ($fields_multi as $field => $meta_key) {
            if (isset($_POST[$field]) && is_array($_POST[$field])) {
                $clean = array();
                foreach ($_POST[$field] as $val) {
                    $clean[] = sanitize_text_field(wp_unslash($val));
                }
                update_post_meta($post_id, $meta_key, $clean);
            } else {
                delete_post_meta($post_id, $meta_key);
            }
        }
    }

    
public function enqueue_assets() {
    if (is_admin()) {
        return;
    }

    $url = plugin_dir_url(__FILE__);

    // Grid-, Player- und Drawer-Assets (werden benötigt, sobald irgendwo Demos oder die Merkliste im Einsatz sind)
    wp_register_style(
        'voice-demo-grid',
        $url . 'assets/css/voice-demo-grid.css',
        array(),
        '2.9.79'
    );
    wp_register_script(
        'voice-demo-grid',
        $url . 'assets/js/voice-demo-grid.js',
        array(),
        '2.9.79',
        true
    );

    wp_enqueue_style('voice-demo-grid');
    wp_enqueue_script('voice-demo-grid');
}

    public function enqueue_admin_assets($hook) {
        global $post;
        if ($hook !== 'post-new.php' && $hook !== 'post.php') {
            return;
        }
        if (!$post || $post->post_type !== 'voice_demo') {
            return;
        }

        $url = plugin_dir_url(__FILE__);

        wp_enqueue_media();
        wp_enqueue_script(
            'voice-demo-admin',
            $url . 'assets/js/voice-demo-admin.js',
            array('jquery'),
            '1.0',
            true
        );
    }

    public function render_demo_grid($atts) {
        $atts = shortcode_atts(array(
            'posts_per_page' => -1,
        ), $atts, 'voice_demo_grid');

        $query_args = array(
            'post_type'      => 'voice_demo',
            'posts_per_page' => intval($atts['posts_per_page']),
            'post_status'    => 'publish',
        );

        $q = new WP_Query($query_args);

        if (!$q->have_posts()) {
            return '<p>Aktuell sind keine Demos verfügbar.</p>';
        }

        $opts  = $this->get_attribute_options();
        $items = array();

        while ($q->have_posts()) {
            $q->the_post();
            $post_id      = get_the_ID();
            $title        = get_the_title($post_id);
            $audio_url    = get_post_meta($post_id, '_voice_demo_audio_url', true);
            $download_url = get_post_meta($post_id, '_voice_demo_download_url', true);
            $mood_saved   = get_post_meta($post_id, '_voice_demo_mood', true);
            $style_saved  = get_post_meta($post_id, '_voice_demo_style', true);
            $speed_saved  = get_post_meta($post_id, '_voice_demo_speed', true);
            $pitch_saved  = get_post_meta($post_id, '_voice_demo_pitch', true);
            $industry     = get_post_meta($post_id, '_voice_demo_industry', true);
            $badge        = get_post_meta($post_id, '_voice_demo_badge', true);
        if (empty($badge)) {
            $badge = 'ID' . $post_id;
        }

            $style_slugs  = is_array($style_saved)  ? $style_saved  : ($style_saved !== ''  ? array($style_saved)  : array());
            $mood_slugs   = is_array($mood_saved)   ? $mood_saved   : ($mood_saved !== ''   ? array($mood_saved)   : array());
            $speed_slugs  = is_array($speed_saved)  ? $speed_saved  : ($speed_saved !== ''  ? array($speed_saved)  : array());
            $pitch_slugs  = is_array($pitch_saved)  ? $pitch_saved  : ($pitch_saved !== ''  ? array($pitch_saved)  : array());

            $terms        = get_the_terms($post_id, 'voice_demo_category');
            $genre_slug   = '';
            $genre_label  = '';

            if ($terms && !is_wp_error($terms)) {
                $first       = reset($terms);
                $genre_slug  = $first->slug;
                $genre_label = $first->name;
            }

            if (!$download_url && $audio_url) {
                $download_url = $audio_url;
            }

            $items[] = array(
                'id'           => $post_id,
                'title'        => $title,
                'audio_url'    => $audio_url,
                'download'     => $download_url,
                'genre_slug'   => $genre_slug,
                'genre_label'  => $genre_label,
                'style_slugs'  => $style_slugs,
                'mood_slugs'   => $mood_slugs,
                'speed_slugs'  => $speed_slugs,
                'pitch_slugs'  => $pitch_slugs,
                'industry'     => $industry,
                'badge'        => $badge,
            );
        }
        wp_reset_postdata();

        ob_start();
        ?>
        <div class="vdemo-wrapper" id="vdemo-wrapper">

            <div class="vdemo-filter-shell">
                <div class="vdemo-filter-meta-top">
                    <span class="vdemo-result-label">
                        <span id="vdemo-result-count"><?php echo esc_html(count($items)); ?></span> Treffer
                    </span>
                    <button class="vdemo-reset-button" id="vdemo-reset-button" type="button">
                        Filter zurücksetzen
                    </button>
                </div>

                <div class="vdemo-filter-bar">
                    <div class="vdemo-filter-row-main">
                        <div class="vdemo-filter-group">
                            <span class="vdemo-filter-label">Genre / Anwendung</span>
                            <div class="vdemo-select-wrapper">
                                <select class="vdemo-select" id="vdemo-filter-genre" data-filter-key="genre">
                                    <option value="all">Alle</option>
                                    <?php
                                    $terms = get_terms(array(
                                        'taxonomy'   => 'voice_demo_category',
                                        'hide_empty' => true,
                                    ));
                                    if (!empty($terms) && !is_wp_error($terms)) :
                                        foreach ($terms as $term) :
                                            ?>
                                            <option value="<?php echo esc_attr($term->slug); ?>">
                                                <?php echo esc_html($term->name); ?>
                                            </option>
                                            <?php
                                        endforeach;
                                    endif;
                                    ?>
                                </select>
                            </div>
                        </div>
                        <?php $opts = $this->get_attribute_options(); ?>
                        <div class="vdemo-filter-group">
                            <span class="vdemo-filter-label">Stil / Tonalität</span>
                            <div class="vdemo-select-wrapper">
                                <select class="vdemo-select" id="vdemo-filter-style" data-filter-key="style" multiple="multiple">
                                    <option value="all">Alle</option>
                                    <?php if (!empty($opts['style'])) : ?>
                                        <?php foreach ($opts['style'] as $slug => $label) : ?>
                                            <option value="<?php echo esc_attr($slug); ?>"><?php echo esc_html($label); ?></option>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </select>
                            </div>
                        </div>
                        <div class="vdemo-filter-group">
                            <span class="vdemo-filter-label">Emotion / Stimmung</span>
                            <div class="vdemo-select-wrapper">
                                <select class="vdemo-select" id="vdemo-filter-mood" data-filter-key="mood" multiple="multiple">
                                    <option value="all">Alle</option>
                                    <?php if (!empty($opts['mood'])) : ?>
                                        <?php foreach ($opts['mood'] as $slug => $label) : ?>
                                            <option value="<?php echo esc_attr($slug); ?>"><?php echo esc_html($label); ?></option>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </select>
                            </div>
                        </div>
                        <div class="vdemo-filter-group">
                            <span class="vdemo-filter-label">Sprechtempo</span>
                            <div class="vdemo-select-wrapper">
                                <select class="vdemo-select" id="vdemo-filter-speed" data-filter-key="speed" multiple="multiple">
                                    <option value="all">Alle</option>
                                    <?php if (!empty($opts['speed'])) : ?>
                                        <?php foreach ($opts['speed'] as $slug => $label) : ?>
                                            <option value="<?php echo esc_attr($slug); ?>"><?php echo esc_html($label); ?></option>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </select>
                            </div>
                        </div>
                        <div class="vdemo-filter-group">
                            <span class="vdemo-filter-label">Tonhöhe</span>
                            <div class="vdemo-select-wrapper">
                                <select class="vdemo-select" id="vdemo-filter-pitch" data-filter-key="pitch" multiple="multiple">
                                    <option value="all">Alle</option>
                                    <?php if (!empty($opts['pitch'])) : ?>
                                        <?php foreach ($opts['pitch'] as $slug => $label) : ?>
                                            <option value="<?php echo esc_attr($slug); ?>"><?php echo esc_html($label); ?></option>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </select>
                            </div>
                        </div>
                        <div class="vdemo-filter-group">
                            <span class="vdemo-filter-label">Branche</span>
                            <div class="vdemo-select-wrapper">
                                <select class="vdemo-select" id="vdemo-filter-industry" data-filter-key="industry">
                                    <option value="all">Alle</option>
                                    <?php if (!empty($opts['industry'])) : ?>
                                        <?php foreach ($opts['industry'] as $slug => $label) : ?>
                                            <option value="<?php echo esc_attr($slug); ?>"><?php echo esc_html($label); ?></option>
                                        <?php endforeach; ?>
                                    <?php endif; ?>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="vdemo-active-filters vdemo-active-filters-empty" id="vdemo-active-filters">
                <span class="vdemo-active-filters-title">Ausgewählte Filter</span>
                <div class="vdemo-active-filters-chips" id="vdemo-active-filters-chips"></div>
            </div>

            <div class="vdemo-grid vdemo-grid-fade-in" id="vdemo-grid">
                <?php foreach ($items as $item) :

                    $style_slugs  = $item['style_slugs'];
                    $mood_slugs   = $item['mood_slugs'];
                    $speed_slugs  = $item['speed_slugs'];
                    $pitch_slugs  = $item['pitch_slugs'];
                    $industry     = $item['industry'];

                    $style_labels = array();
                    foreach ($style_slugs as $slug) {
                        if (isset($opts['style'][$slug])) {
                            $style_labels[] = $opts['style'][$slug];
                        }
                    }

                    $mood_labels = array();
                    foreach ($mood_slugs as $slug) {
                        if (isset($opts['mood'][$slug])) {
                            $mood_labels[] = $opts['mood'][$slug];
                        }
                    }

                    $pitch_labels = array();
                    foreach ($pitch_slugs as $slug) {
                        if (isset($opts['pitch'][$slug])) {
                            $pitch_labels[] = $opts['pitch'][$slug];
                        }
                    }

                    $speed_labels = array();
                    foreach ($speed_slugs as $slug) {
                        if (isset($opts['speed'][$slug])) {
                            $speed_labels[] = $opts['speed'][$slug];
                        }
                    }

                    $info_parts = array();

                    if ($industry && isset($opts['industry'][$industry])) {
                        $info_parts[] = $opts['industry'][$industry];
                    } elseif ($item['genre_label'] !== '') {
                        $info_parts[] = $item['genre_label'];
                    }

                    if (!empty($style_labels)) {
                        $info_parts = array_merge($info_parts, $style_labels);
                    }
                    if (!empty($mood_labels)) {
                        $info_parts = array_merge($info_parts, $mood_labels);
                    }
                    if (!empty($pitch_labels)) {
                        $info_parts = array_merge($info_parts, $pitch_labels);
                    }
                    if (!empty($speed_labels)) {
                        $info_parts = array_merge($info_parts, $speed_labels);
                    }

                    $info_text = implode(' • ', $info_parts);

                    $style_attr    = implode(' ', array_map('sanitize_title', $style_slugs));
                    $mood_attr     = implode(' ', array_map('sanitize_title', $mood_slugs));
                    $speed_attr    = implode(' ', array_map('sanitize_title', $speed_slugs));
                    $pitch_attr    = implode(' ', array_map('sanitize_title', $pitch_slugs));
                    $industry_attr = $industry ? sanitize_title($industry) : '';

                    ?>
                    <div class="vdemo-card"
                         data-genre="<?php echo esc_attr($item['genre_slug']); ?>"
                         data-style="<?php echo esc_attr($style_attr); ?>"
                         data-mood="<?php echo esc_attr($mood_attr); ?>"
                         data-speed="<?php echo esc_attr($speed_attr); ?>"
                         data-pitch="<?php echo esc_attr($pitch_attr); ?>"
                         data-industry="<?php echo esc_attr($industry_attr); ?>">
                        <div class="vdemo-card-inner">
                            <div class="vdemo-card-header">
                                <div class="vdemo-card-title-wrap">
                                    <?php if (!empty($item['badge'])) : ?>
                                        <span class="vdemo-badge"><?php echo esc_html($item['badge']); ?></span>
                                    <?php endif; ?>
                                    <h3 class="vdemo-title"><?php echo esc_html($item['title']); ?></h3>
                                    <?php if (!empty($info_parts)) : ?>
                                        <button type="button" class="vdemo-subline-info-badge" aria-label="Eigenschaften anzeigen">
                                            <span class="vdemo-subline-info-tooltip">
                                                <?php foreach ($info_parts as $part) : ?>
                                                    <span class="vdemo-subline-chip"><?php echo esc_html($part); ?></span>
                                                <?php endforeach; ?>
                                            </span>
                                        </button>
                                    <?php endif; ?>
                                </div>
                            </div>

                            <div class="vdemo-card-audio">
                                <button class="vdemo-play-button" type="button">
                                    <span class="vdemo-play-icon-play"></span>
                                    <span class="vdemo-play-icon-pause"></span>
                                </button>
                                <div class="vdemo-progress-wrapper">
                                    <div class="vdemo-progress-track">
                                        <div class="vdemo-progress-fill"></div>
                                    </div>
                                </div>
                                <span class="vdemo-time-label">0:00</span>
                                <?php if (!empty($item['audio_url'])) : ?>
                                    <audio class="vdemo-audio" src="<?php echo esc_url($item['audio_url']); ?>" preload="none"></audio>
                                <?php endif; ?>
                            </div>

                            <div class="vdemo-card-footer">
                                <?php if (!empty($item['download'])) : ?>
                                    <a class="vdemo-btn vdemo-btn-secondary" href="<?php echo esc_url($item['download']); ?>" download>
                                        Download
                                    </a>
                                <?php endif; ?>
                                <button
                                    class="vdemo-btn vdemo-btn-primary vdemo-memo-button"
                                    type="button"
                                    data-demo-id="<?php echo esc_attr($item['id']); ?>"
                                    data-demo-title="<?php echo esc_attr($item['title']); ?>"
                                    data-demo-info="<?php echo esc_attr($info_text); ?>"
                                    data-demo-genre="<?php echo esc_attr($item['genre_label']); ?>"
                                    data-demo-genre-slug="<?php echo esc_attr($item['genre_slug']); ?>"
                                    data-demo-audio="<?php echo esc_url($item['audio_url']); ?>"
                                    data-demo-badge="<?php echo esc_attr($item['badge']); ?>"
                                >
                                    <span class="vdemo-memo-label">Auf die Merkliste</span>
                                </button>
                            </div>
                        </div>
                    </div>
                <?php endforeach; ?>
            </div>

            <button class="vdemo-drawer-toggle" id="vdemo-drawer-toggle" type="button">
                <span class="vdemo-drawer-toggle-icon">
                    <svg viewBox="0 0 24 24" class="vdemo-icon-svg" aria-hidden="true" focusable="false">
                        <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14.5a.5.5 0 0 1-.79.407L12 15.5l-5.21 3.407A.5.5 0 0 1 6 18.5V4zm2 0h8v11.382l-4.21-2.75a1 1 0 0 0-1.08 0L8 15.382V4z" />
                    </svg>
                </span>
                <span class="vdemo-drawer-toggle-label">Gemerkte Demos</span>
                <span class="vdemo-drawer-count" id="vdemo-drawer-count">0</span>
            </button>

            <aside class="vdemo-drawer" id="vdemo-drawer" aria-hidden="true">
                <div class="vdemo-drawer-header">
                    <h4>Gemerkte Demos</h4>
                    <button class="vdemo-drawer-close" id="vdemo-drawer-close" type="button">
                        Schließen
                    </button>
                </div>
                <div class="vdemo-drawer-body">
                    <div class="vdemo-drawer-list-wrap">
                        <ul class="vdemo-drawer-list" id="vdemo-drawer-list"></ul>
                    </div>
                </div>
                <div class="vdemo-drawer-footer">
                    <div class="vdemo-drawer-footer-inner">
                        <div class="vdemo-drawer-footer-buttons">
                            <button type="button" class="vdemo-drawer-btn vdemo-drawer-btn-primary" id="vdemo-drawer-add">
                                Zur Anfrage hinzufügen
                            </button>
                            <button type="button" class="vdemo-drawer-btn vdemo-drawer-btn-ghost" id="vdemo-drawer-share">
                                Merkliste teilen
                            </button>
                        </div>

                        <div class="vdemo-drawer-info-box">
                            <strong>So funktioniert's:</strong>
                            <p>Deine gemerkten Demos werden Deiner Anfrage automatisch angehängt – so bekomme ich sofort ein Gefühl für Deinen gewünschten Klang und Stil. Optional kannst Du Deine Auswahl über den Teilen-Button mit anderen abstimmen.</p>
                        </div>

                        <button type="button" class="vdemo-drawer-btn vdemo-drawer-btn-danger" id="vdemo-drawer-clear">
                            Liste leeren
                        </button>
                    </div>
                </div>
            </aside>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Standalone-Player Shortcode [voice_demo_player id="123"]
     */
    public function render_demo_player($atts) {
    $atts = shortcode_atts(array(
        'id' => 0,
    ), $atts, 'voice_demo_player');

    $post_id = intval($atts['id']);
    if (!$post_id) {
        return '';
    }

    $post = get_post($post_id);
    if (!$post || $post->post_type !== 'voice_demo') {
        return '';
    }

    $opts         = $this->get_attribute_options();
    $title        = get_the_title($post_id);
    $audio_url    = get_post_meta($post_id, '_voice_demo_audio_url', true);
    $styles_saved = get_post_meta($post_id, '_voice_demo_style', true);
    $moods_saved  = get_post_meta($post_id, '_voice_demo_mood', true);
    $speeds_saved = get_post_meta($post_id, '_voice_demo_speed', true);
    $pitches_saved= get_post_meta($post_id, '_voice_demo_pitch', true);
    $industry     = get_post_meta($post_id, '_voice_demo_industry', true);
    $badge        = get_post_meta($post_id, '_voice_demo_badge', true);

    $style_slugs  = is_array($styles_saved)  ? $styles_saved  : ($styles_saved  !== '' ? array($styles_saved)  : array());
    $mood_slugs   = is_array($moods_saved)   ? $moods_saved   : ($moods_saved   !== '' ? array($moods_saved)   : array());
    $speed_slugs  = is_array($speeds_saved)  ? $speeds_saved  : ($speeds_saved  !== '' ? array($speeds_saved)  : array());
    $pitch_slugs  = is_array($pitches_saved) ? $pitches_saved : ($pitches_saved !== '' ? array($pitches_saved) : array());

    $terms       = get_the_terms($post_id, 'voice_demo_category');
    $genre_slug  = '';
    $genre_label = '';

    if ($terms && !is_wp_error($terms)) {
        $first       = reset($terms);
        $genre_slug  = $first->slug;
        $genre_label = $first->name;
    }

    $style_labels = array();
    foreach ($style_slugs as $slug) {
        if (isset($opts['style'][$slug])) {
            $style_labels[] = $opts['style'][$slug];
        }
    }

    $mood_labels = array();
    foreach ($mood_slugs as $slug) {
        if (isset($opts['mood'][$slug])) {
            $mood_labels[] = $opts['mood'][$slug];
        }
    }

    $pitch_labels = array();
    foreach ($pitch_slugs as $slug) {
        if (isset($opts['pitch'][$slug])) {
            $pitch_labels[] = $opts['pitch'][$slug];
        }
    }

    $speed_labels = array();
    foreach ($speed_slugs as $slug) {
        if (isset($opts['speed'][$slug])) {
            $speed_labels[] = $opts['speed'][$slug];
        }
    }

    $info_parts = array();
    if (!empty($genre_label)) {
        $info_parts[] = $genre_label;
    }
    if (!empty($industry)) {
        $info_parts[] = $industry;
    }
    if (!empty($style_labels)) {
        $info_parts = array_merge($info_parts, $style_labels);
    }
    if (!empty($mood_labels)) {
        $info_parts = array_merge($info_parts, $mood_labels);
    }
    if (!empty($pitch_labels)) {
        $info_parts = array_merge($info_parts, $pitch_labels);
    }
    if (!empty($speed_labels)) {
        $info_parts = array_merge($info_parts, $speed_labels);
    }

    $info_text = implode(' • ', $info_parts);

    ob_start();
    ?>
    <div class="vdemo-standalone-player">
        <div class="vdemo-standalone-header">
            <div class="vdemo-standalone-header-left">
                <?php if (!empty($badge)) : ?>
                    <span class="vdemo-badge vdemo-badge-inline"><?php echo esc_html($badge); ?></span>
                <?php endif; ?>
                <span class="vdemo-standalone-audio-title"><?php echo esc_html($title); ?></span>
                <?php if (!empty($info_parts)) : ?>
                    <button type="button" class="vdemo-subline-info-badge vdemo-subline-info-badge-small" aria-label="Eigenschaften anzeigen">
                        <span class="vdemo-subline-info-tooltip">
                            <?php foreach ($info_parts as $part) : ?>
                                <span class="vdemo-subline-chip"><?php echo esc_html($part); ?></span>
                            <?php endforeach; ?>
                        </span>
                    </button>
                <?php endif; ?>
            </div>

            <div class="vdemo-standalone-header-right">
                <?php if (!empty($audio_url)) : ?>
                    <a class="vdemo-download-mini" href="<?php echo esc_url($audio_url); ?>" download>
                        <svg viewBox="0 0 24 24" class="vdemo-icon-svg" aria-hidden="true" focusable="false">
                            <path d="M12 3a1 1 0 0 1 1 1v9.086l3.293-3.293a1 1 0 0 1 1.414 1.414l-5 5a1 1 0 0 1-1.414 0l-5-5A1 1 0 0 1 7.707 9.793L11 13.086V4a1 1 0 0 1 1-1zm-6 16a1 1 0 0 1 1-1h10a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1z"/>
                        </svg>
                    </a>
                <?php endif; ?>

                <button
                    class="vdemo-memo-mini vdemo-memo-button"
                    type="button"
                    aria-label="Demo merken"
                    data-demo-id="<?php echo esc_attr($post_id); ?>"
                    data-demo-title="<?php echo esc_attr($title); ?>"
                    data-demo-info="<?php echo esc_attr($info_text); ?>"
                    data-demo-genre="<?php echo esc_attr($genre_label); ?>"
                    data-demo-genre-slug="<?php echo esc_attr($genre_slug); ?>"
                    data-demo-audio="<?php echo esc_url($audio_url); ?>"
                    data-demo-badge="<?php echo esc_attr($badge); ?>"
                >
                    <span class="vdemo-memo-mini-icon">
                        <svg viewBox="0 0 24 24" class="vdemo-icon-svg" aria-hidden="true" focusable="false">
                            <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14.5a.5.5 0 0 1-.79.407L12 15.5l-5.21 3.407A.5.5 0 0 1 6 18.5V4zm2 0h8v11.382l-4.21-2.75a1 1 0 0 0-1.08 0L8 15.382V4z" />
                        </svg>
                    </span>
                    <span class="vdemo-memo-mini-tooltip">Auf die Merkliste setzen</span>
                </button>
            </div>
        </div>

        <div class="vdemo-card-audio vdemo-card-audio-standalone">
            <button class="vdemo-play-button" type="button">
                <span class="vdemo-play-icon-play"></span>
                <span class="vdemo-play-icon-pause"></span>
            </button>

            <div class="vdemo-progress-wrapper">
                <div class="vdemo-progress-track">
                    <div class="vdemo-progress-fill"></div>
                </div>
            </div>

            <span class="vdemo-time-label">0:00</span>
            <?php if (!empty($audio_url)) : ?>
                <audio class="vdemo-audio" src="<?php echo esc_url($audio_url); ?>" preload="none"></audio>
            <?php endif; ?>
        </div>
    </div>
    <?php
    return ob_get_clean();
}

public function add_shortcode_column($columns) {
        $columns['vdemo_shortcode'] = 'Shortcode';
        return $columns;
    }

    public function render_shortcode_column($column, $post_id) {
        if ($column === 'vdemo_shortcode') {
            $badge = get_post_meta($post_id, '_voice_demo_badge', true);
            echo '<code>[voice_demo_player id="' . intval($post_id) . '"]</code>';
            if (!empty($badge)) {
                echo '<br /><small>Demo-ID: ' . esc_html($badge) . '</small>';
            }
        }
    }


    public function render_global_drawer() {
        if (is_admin()) {
            return;
        }

        if (function_exists('wp_doing_ajax') && wp_doing_ajax()) {
            return;
        }

        global $post;

        if ($post instanceof WP_Post && has_shortcode($post->post_content, 'voice_demo_grid')) {
            // Auf der Grid-Seite wird der Drawer direkt innerhalb des Shortcodes gerendert.
            return;
        }
?>
        <button class="vdemo-drawer-toggle" id="vdemo-drawer-toggle" type="button">
                        <span class="vdemo-drawer-toggle-icon">
                            <svg viewBox="0 0 24 24" class="vdemo-icon-svg" aria-hidden="true" focusable="false">
                                <path d="M6 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14.5a.5.5 0 0 1-.79.407L12 15.5l-5.21 3.407A.5.5 0 0 1 6 18.5V4zm2 0h8v11.382l-4.21-2.75a1 1 0 0 0-1.08 0L8 15.382V4z" />
                            </svg>
                        </span>
                        <span class="vdemo-drawer-toggle-label">Gemerkte Demos</span>
                        <span class="vdemo-drawer-count" id="vdemo-drawer-count">0</span>
                    </button>
        
                    <aside class="vdemo-drawer" id="vdemo-drawer" aria-hidden="true">
                        <div class="vdemo-drawer-header">
                            <h4>Gemerkte Demos</h4>
                            <button class="vdemo-drawer-close" id="vdemo-drawer-close" type="button">
                                Schließen
                            </button>
                        </div>
                        <div class="vdemo-drawer-body">
                            <div class="vdemo-drawer-list-wrap">
                                <ul class="vdemo-drawer-list" id="vdemo-drawer-list"></ul>
                            </div>
                        </div>
                        <div class="vdemo-drawer-footer">
                            <div class="vdemo-drawer-footer-inner">
                                <div class="vdemo-drawer-footer-buttons">
                                    <button type="button" class="vdemo-drawer-btn vdemo-drawer-btn-primary" id="vdemo-drawer-add">
                                        Zur Anfrage hinzufügen
                                    </button>
                                    <button type="button" class="vdemo-drawer-btn vdemo-drawer-btn-ghost" id="vdemo-drawer-share">
                                        Merkliste teilen
                                    </button>
                                </div>
        
                                <div class="vdemo-drawer-info-box">
                                    <strong>So funktioniert's:</strong>
                                    <p>Deine gemerkten Demos werden Deiner Anfrage automatisch angehängt – so bekomme ich sofort ein Gefühl für Deinen gewünschten Klang und Stil. Optional kannst Du Deine Auswahl über den Teilen-Button mit anderen abstimmen.</p>
                                </div>
        
                                <button type="button" class="vdemo-drawer-btn vdemo-drawer-btn-danger" id="vdemo-drawer-clear">
                                    Liste leeren
                                </button>
                            </div>
                        </div>
                    </aside>
<?php
    }
}

new PK_Voice_Demo_System();
