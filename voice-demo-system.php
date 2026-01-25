<?php
/**
 * Plugin Name: Voice Demo System
 * Description: Modern voice demo manager with custom audio player, filtering, and favorites.
 * Version: 2.0.0
 * Author: Voice Demo System
 */

if (!defined('ABSPATH')) {
    exit;
}

define('VDS_VERSION', '2.0.0');
define('VDS_PATH', plugin_dir_path(__FILE__));
define('VDS_URL', plugin_dir_url(__FILE__));

require_once VDS_PATH . 'includes/PostType.php';
require_once VDS_PATH . 'includes/MetaBoxes.php';
require_once VDS_PATH . 'includes/Shortcodes.php';

use VoiceDemoSystem\PostType;
use VoiceDemoSystem\MetaBoxes;
use VoiceDemoSystem\Shortcodes;

final class VoiceDemoSystemPlugin
{
    public function __construct()
    {
        new PostType();
        new MetaBoxes();
        new Shortcodes();
    }
}

add_action('plugins_loaded', static function () {
    new VoiceDemoSystemPlugin();
});
