/* eslint-env node */

module.exports = ({ config }) => {
  const plugins = Array.isArray(config.plugins) ? config.plugins : [];
  const signingPlugin = './plugins/with-android-signing.js';

  return {
    ...config,
    plugins: plugins.includes(signingPlugin)
      ? plugins
      : [...plugins, signingPlugin],
  };
};
