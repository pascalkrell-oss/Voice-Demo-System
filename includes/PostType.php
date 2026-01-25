<?php
namespace VoiceDemoSystem;

if (!defined('ABSPATH')) {
    exit;
}

class PostType
{
    public function __construct()
    {
        add_action('init', [$this, 'register_post_type']);
        add_action('init', [$this, 'register_taxonomy']);
    }

    public function register_post_type(): void
    {
        $labels = [
            'name' => __('Voice Demos', 'voice-demo-system'),
            'singular_name' => __('Voice Demo', 'voice-demo-system'),
            'add_new' => __('Add New', 'voice-demo-system'),
            'add_new_item' => __('Add New Voice Demo', 'voice-demo-system'),
            'edit_item' => __('Edit Voice Demo', 'voice-demo-system'),
            'new_item' => __('New Voice Demo', 'voice-demo-system'),
            'view_item' => __('View Voice Demo', 'voice-demo-system'),
            'search_items' => __('Search Voice Demos', 'voice-demo-system'),
            'not_found' => __('No voice demos found', 'voice-demo-system'),
            'not_found_in_trash' => __('No voice demos found in Trash', 'voice-demo-system'),
            'menu_name' => __('Voice Demos', 'voice-demo-system'),
        ];

        $args = [
            'labels' => $labels,
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => true,
            'menu_icon' => 'dashicons-microphone',
            'supports' => ['title', 'editor', 'thumbnail'],
            'has_archive' => false,
            'rewrite' => false,
            'show_in_rest' => false,
        ];

        register_post_type('voice_demo', $args);
    }

    public function register_taxonomy(): void
    {
        $labels = [
            'name' => __('Genres', 'voice-demo-system'),
            'singular_name' => __('Genre', 'voice-demo-system'),
            'search_items' => __('Search Genres', 'voice-demo-system'),
            'all_items' => __('All Genres', 'voice-demo-system'),
            'edit_item' => __('Edit Genre', 'voice-demo-system'),
            'update_item' => __('Update Genre', 'voice-demo-system'),
            'add_new_item' => __('Add New Genre', 'voice-demo-system'),
            'new_item_name' => __('New Genre Name', 'voice-demo-system'),
            'menu_name' => __('Genres', 'voice-demo-system'),
        ];

        $args = [
            'labels' => $labels,
            'public' => false,
            'show_ui' => true,
            'show_in_menu' => true,
            'show_admin_column' => true,
            'hierarchical' => true,
            'show_in_rest' => false,
        ];

        register_taxonomy('voice_demo_category', ['voice_demo'], $args);
    }
}
