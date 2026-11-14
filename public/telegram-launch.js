// iOS Telegram can reload the Mini App and drop the launch hash before the app's modules run;
// this runs from <head>, while the hash with the fresh initData is still there
window.__tgLaunchHash = location.hash;
