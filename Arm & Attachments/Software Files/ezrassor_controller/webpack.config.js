const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const path = require('path');

module.exports = async function (env, argv) {
    const config = await createExpoWebpackConfigAsync(env, argv);

    config.resolve.alias = {
        ...config.resolve.alias,
        'ezrassor-app': path.resolve(__dirname),
    };

    return config;
};
