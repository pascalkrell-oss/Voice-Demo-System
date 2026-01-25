<?php
namespace VoiceDemoSystem;

if (!defined('ABSPATH')) {
    exit;
}

class Shortcodes
{
    public function __construct()
    {
        add_shortcode('voice_demo_grid', [$this, 'render_grid']);
        add_shortcode('voice_demo_player', [$this, 'render_player']);
        add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
    }

    public function enqueue_assets(): void
    {
        if (!is_singular() && !is_page()) {
            return;
        }

        wp_register_style(
            'vds-styles',
            VDS_URL . 'assets/css/vds-styles.css',
            [],
            VDS_VERSION
        );
        wp_register_script(
            'vds-frontend',
            VDS_URL . 'assets/js/vds-frontend.js',
            [],
            VDS_VERSION,
            true
        );

        wp_enqueue_style('vds-styles');
        wp_enqueue_script('vds-frontend');

        wp_localize_script('vds-frontend', 'VDS_DATA', [
            'favoritesParam' => isset($_GET['vdemo_favs']) ? sanitize_text_field(wp_unslash($_GET['vdemo_favs'])) : '',
            'strings' => [
                'favoritesTitle' => __('Merkliste', 'voice-demo-system'),
                'favoritesEmpty' => __('Noch keine Favoriten ausgewählt.', 'voice-demo-system'),
                'favoritesShare' => __('Share', 'voice-demo-system'),
            ],
        ]);
    }

    public function render_grid(): string
    {
        $terms = get_terms([
            'taxonomy' => 'voice_demo_category',
            'hide_empty' => true,
        ]);

        $query = new \WP_Query([
            'post_type' => 'voice_demo',
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ]);

        ob_start();
        ?>
        <section class="vds-shell" data-vds-grid>
            <header class="vds-header">
                <div>
                    <p class="vds-eyebrow"><?php echo esc_html__('Voice Demo System', 'voice-demo-system'); ?></p>
                    <h2 class="vds-title"><?php echo esc_html__('Find the perfect voice for your project', 'voice-demo-system'); ?></h2>
                    <p class="vds-subtitle"><?php echo esc_html__('Filter, preview, and save your favorite voice demos.', 'voice-demo-system'); ?></p>
                </div>
                <button class="vds-drawer-toggle" type="button" data-vds-drawer-open>
                    <span><?php echo esc_html__('Merkliste', 'voice-demo-system'); ?></span>
                    <span class="vds-count" data-vds-fav-count>0</span>
                </button>
            </header>

            <div class="vds-filters" role="tablist">
                <button class="vds-filter is-active" type="button" data-vds-filter="all">
                    <?php echo esc_html__('Alle', 'voice-demo-system'); ?>
                </button>
                <?php foreach ($terms as $term) : ?>
                    <button class="vds-filter" type="button" data-vds-filter="<?php echo esc_attr($term->slug); ?>">
                        <?php echo esc_html($term->name); ?>
                    </button>
                <?php endforeach; ?>
            </div>

            <div class="vds-grid">
                <?php
                if ($query->have_posts()) :
                    while ($query->have_posts()) :
                        $query->the_post();
                        $post_id = get_the_ID();
                        $audio_url = get_post_meta($post_id, 'vds_audio_url', true);
                        $download_url = get_post_meta($post_id, 'vds_download_url', true);
                        $badge_id = get_post_meta($post_id, 'vds_badge_id', true);
                        $style = get_post_meta($post_id, 'vds_style', true);
                        $mood = get_post_meta($post_id, 'vds_mood', true);
                        $tempo = get_post_meta($post_id, 'vds_tempo', true);
                        $pitch = get_post_meta($post_id, 'vds_pitch', true);
                        $industry = get_post_meta($post_id, 'vds_industry', true);
                        $categories = wp_get_post_terms($post_id, 'voice_demo_category', ['fields' => 'slugs']);
                        $category_data = implode(' ', $categories);
                        ?>
                        <article class="vds-card" data-vds-card data-category="<?php echo esc_attr($category_data); ?>">
                            <div class="vds-card-header">
                                <div>
                                    <p class="vds-card-title"><?php the_title(); ?></p>
                                    <p class="vds-card-meta">
                                        <?php echo esc_html($style ? $style : __('Stil flexibel', 'voice-demo-system')); ?>
                                        <?php if ($badge_id) : ?>
                                            <span class="vds-badge">#<?php echo esc_html($badge_id); ?></span>
                                        <?php endif; ?>
                                    </p>
                                </div>
                                <button class="vds-fav-toggle" type="button" data-vds-fav-toggle data-id="<?php echo esc_attr($post_id); ?>">
                                    <span class="vds-fav-icon" aria-hidden="true">♡</span>
                                    <span class="vds-sr-only"><?php echo esc_html__('Merken', 'voice-demo-system'); ?></span>
                                </button>
                            </div>

                            <div class="vds-player" data-vds-player data-id="<?php echo esc_attr($post_id); ?>" data-title="<?php echo esc_attr(get_the_title()); ?>" data-badge="<?php echo esc_attr($badge_id); ?>" data-audio="<?php echo esc_url($audio_url); ?>">
                                <button class="vds-play" type="button" data-vds-play>
                                    <span class="vds-play-icon">▶</span>
                                </button>
                                <div class="vds-progress" data-vds-progress>
                                    <div class="vds-progress-track"></div>
                                    <div class="vds-progress-fill" data-vds-progress-fill></div>
                                </div>
                                <div class="vds-time">
                                    <span data-vds-current>0:00</span>
                                    <span data-vds-duration>0:00</span>
                                </div>
                                <audio preload="none" src="<?php echo esc_url($audio_url); ?>"></audio>
                            </div>

                            <div class="vds-tags">
                                <?php if ($mood) : ?><span><?php echo esc_html($mood); ?></span><?php endif; ?>
                                <?php if ($tempo) : ?><span><?php echo esc_html($tempo); ?></span><?php endif; ?>
                                <?php if ($pitch) : ?><span><?php echo esc_html($pitch); ?></span><?php endif; ?>
                                <?php if ($industry) : ?><span><?php echo esc_html($industry); ?></span><?php endif; ?>
                            </div>

                            <?php if ($download_url) : ?>
                                <a class="vds-download" href="<?php echo esc_url($download_url); ?>" target="_blank" rel="noopener">
                                    <?php echo esc_html__('Download', 'voice-demo-system'); ?>
                                </a>
                            <?php endif; ?>
                        </article>
                        <?php
                    endwhile;
                    wp_reset_postdata();
                else :
                    ?>
                    <p class="vds-empty"><?php echo esc_html__('No voice demos available.', 'voice-demo-system'); ?></p>
                <?php endif; ?>
            </div>
        </section>

        <div class="vds-drawer" data-vds-drawer>
            <div class="vds-drawer-panel">
                <div class="vds-drawer-header">
                    <h3><?php echo esc_html__('Merkliste', 'voice-demo-system'); ?></h3>
                    <button class="vds-drawer-close" type="button" data-vds-drawer-close aria-label="<?php echo esc_attr__('Close', 'voice-demo-system'); ?>">×</button>
                </div>
                <div class="vds-drawer-body" data-vds-fav-list>
                    <p class="vds-empty" data-vds-fav-empty><?php echo esc_html__('Noch keine Favoriten ausgewählt.', 'voice-demo-system'); ?></p>
                </div>
                <div class="vds-drawer-footer">
                    <button class="vds-share" type="button" data-vds-share>
                        <?php echo esc_html__('Share', 'voice-demo-system'); ?>
                    </button>
                </div>
            </div>
            <button class="vds-drawer-backdrop" type="button" data-vds-drawer-close aria-hidden="true"></button>
        </div>
        <?php
        return ob_get_clean();
    }

    public function render_player(array $atts): string
    {
        $atts = shortcode_atts([
            'id' => 0,
        ], $atts);

        $post_id = (int) $atts['id'];
        if (!$post_id) {
            return '';
        }

        $post = get_post($post_id);
        if (!$post || $post->post_type !== 'voice_demo') {
            return '';
        }

        $audio_url = get_post_meta($post_id, 'vds_audio_url', true);
        $badge_id = get_post_meta($post_id, 'vds_badge_id', true);

        ob_start();
        ?>
        <div class="vds-player vds-player-inline" data-vds-player data-id="<?php echo esc_attr($post_id); ?>" data-title="<?php echo esc_attr(get_the_title($post_id)); ?>" data-badge="<?php echo esc_attr($badge_id); ?>" data-audio="<?php echo esc_url($audio_url); ?>">
            <button class="vds-play" type="button" data-vds-play>
                <span class="vds-play-icon">▶</span>
            </button>
            <div class="vds-progress" data-vds-progress>
                <div class="vds-progress-track"></div>
                <div class="vds-progress-fill" data-vds-progress-fill></div>
            </div>
            <div class="vds-time">
                <span data-vds-current>0:00</span>
                <span data-vds-duration>0:00</span>
            </div>
            <audio preload="none" src="<?php echo esc_url($audio_url); ?>"></audio>
        </div>
        <?php
        return ob_get_clean();
    }
}
