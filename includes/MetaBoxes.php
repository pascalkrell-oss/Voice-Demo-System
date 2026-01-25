<?php
namespace VoiceDemoSystem;

if (!defined('ABSPATH')) {
    exit;
}

class MetaBoxes
{
    private array $fields = [
        'vds_audio_url' => 'Audio URL',
        'vds_download_url' => 'Download URL',
        'vds_badge_id' => 'Demo-ID',
        'vds_style' => 'Stil',
        'vds_mood' => 'Stimmung',
        'vds_tempo' => 'Tempo',
        'vds_pitch' => 'Tonhöhe',
        'vds_industry' => 'Branche',
    ];

    public function __construct()
    {
        add_action('add_meta_boxes', [$this, 'register_meta_boxes']);
        add_action('save_post_voice_demo', [$this, 'save_meta'], 10, 2);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
    }

    public function register_meta_boxes(): void
    {
        add_meta_box(
            'vds_demo_details',
            __('Demo Details', 'voice-demo-system'),
            [$this, 'render_meta_box'],
            'voice_demo',
            'normal',
            'high'
        );
    }

    public function enqueue_admin_assets(string $hook): void
    {
        if (!in_array($hook, ['post.php', 'post-new.php'], true)) {
            return;
        }

        $screen = get_current_screen();
        if (!$screen || $screen->post_type !== 'voice_demo') {
            return;
        }

        wp_register_style('vds-admin', false, [], VDS_VERSION);
        wp_enqueue_style('vds-admin');

        $css = "
            .vds-meta-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:12px;}
            .vds-meta-field{background:#f7f9fb;border:1px solid #e2e6ea;padding:12px 14px;border-radius:12px;}
            .vds-meta-field label{display:block;font-weight:600;margin-bottom:6px;}
            .vds-meta-field input{width:100%;padding:8px 10px;border-radius:8px;border:1px solid #d5dbe1;background:#fff;}
            .vds-meta-note{color:#5b6b7b;font-size:12px;margin-top:6px;}
        ";
        wp_add_inline_style('vds-admin', $css);
    }

    public function render_meta_box($post): void
    {
        wp_nonce_field('vds_save_meta', 'vds_meta_nonce');

        echo '<div class="vds-meta-grid">';
        foreach ($this->fields as $key => $label) {
            $value = get_post_meta($post->ID, $key, true);
            $type = in_array($key, ['vds_audio_url', 'vds_download_url'], true) ? 'url' : 'text';
            printf(
                '<div class="vds-meta-field"><label for="%1$s">%2$s</label><input id="%1$s" name="%1$s" type="%3$s" value="%4$s" placeholder="%5$s" />%6$s</div>',
                esc_attr($key),
                esc_html($label),
                esc_attr($type),
                esc_attr($value),
                esc_attr($this->get_placeholder($key)),
                $this->get_field_note($key)
            );
        }
        echo '</div>';
    }

    public function save_meta(int $post_id, $post): void
    {
        if (!isset($_POST['vds_meta_nonce']) || !wp_verify_nonce($_POST['vds_meta_nonce'], 'vds_save_meta')) {
            return;
        }

        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        foreach ($this->fields as $key => $label) {
            if (!isset($_POST[$key])) {
                continue;
            }

            $value = sanitize_text_field(wp_unslash($_POST[$key]));
            if (in_array($key, ['vds_audio_url', 'vds_download_url'], true)) {
                $value = esc_url_raw($value);
            }

            if ($key === 'vds_badge_id' && $value === '') {
                $value = $this->generate_badge_id();
            }

            update_post_meta($post_id, $key, $value);
        }
    }

    private function generate_badge_id(): string
    {
        $query = new \WP_Query([
            'post_type' => 'voice_demo',
            'posts_per_page' => 1,
            'post_status' => 'any',
            'meta_key' => 'vds_badge_id',
            'orderby' => 'meta_value_num',
            'order' => 'DESC',
            'fields' => 'ids',
        ]);

        $max_id = 0;
        if (!empty($query->posts)) {
            $max_id = (int) get_post_meta($query->posts[0], 'vds_badge_id', true);
        }

        return (string) ($max_id + 1);
    }

    private function get_placeholder(string $key): string
    {
        switch ($key) {
            case 'vds_audio_url':
                return __('https://example.com/audio.mp3', 'voice-demo-system');
            case 'vds_download_url':
                return __('https://example.com/download.mp3', 'voice-demo-system');
            case 'vds_badge_id':
                return __('Auto-generated if empty', 'voice-demo-system');
            default:
                return __('Optional', 'voice-demo-system');
        }
    }

    private function get_field_note(string $key): string
    {
        if ($key === 'vds_badge_id') {
            return '<p class="vds-meta-note">' . esc_html__('Leave empty to auto-generate the next ID.', 'voice-demo-system') . '</p>';
        }

        return '';
    }
}
